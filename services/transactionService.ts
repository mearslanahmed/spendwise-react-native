import { FirebaseError } from "firebase/app";
import { firestore } from "@/config/firebase";
import { TransactionType, WalletType, ResponseType } from "@/types";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  getAggregateFromServer,
  sum,
  limit,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageService";
import { CreateOrUpdateWallet } from "./walletService";
import { getLast12Months, getLast7Days, getYearsRange } from "@/utils/common";
import { scale } from "@/utils/styling";
import { colors } from "@/constants/theme";
import { resolveDate } from "@/utils/dateHelper";

/**
 * Creates a transfer transaction between two wallets. 
 * This involves deducting from the source wallet and adding to the destination wallet.
 * It also logs two transaction entries (one expense, one income) to track the transfer accurately.
 * 
 * @param {string} sourceWalletId - The ID of the wallet the money is coming from.
 * @param {string} destWalletId - The ID of the wallet receiving the money.
 * @param {number} amount - The amount to transfer. Must be greater than 0.
 * @param {string} uid - The unique Firebase user ID performing the transfer.
 * @param {string} [note] - An optional description of the transfer.
 * @returns {Promise<ResponseType>} A success boolean and an optional error message if failed.
 */
export const createTransfer = async (
  sourceWalletId: string,
  destWalletId: string,
  amount: number,
  uid: string,
  note?: string
): Promise<ResponseType> => {
  try {
    const normalizedAmount = Number(amount);
    if (isNaN(normalizedAmount) || normalizedAmount <= 0) {
      return { success: false, msg: "Please enter a valid amount" };
    }
    if (sourceWalletId === destWalletId) {
      return { success: false, msg: "Source and destination wallet must be different" };
    }

    const batch = writeBatch(firestore);

    // Validate & update source wallet (deduct)
    const sourceRef = doc(firestore, "wallets", sourceWalletId);
    const sourceSnap = await getDoc(sourceRef);
    if (!sourceSnap.exists()) return { success: false, msg: "Source wallet not found" };
    const sourceData = sourceSnap.data() as WalletType;
    if ((sourceData.amount || 0) < normalizedAmount) {
      return { success: false, msg: "Source wallet doesn't have enough balance" };
    }
    batch.update(sourceRef, {
      amount: (sourceData.amount || 0) - normalizedAmount,
      totalExpense: (sourceData.totalExpense || 0) + normalizedAmount,
    });

    // Validate & update destination wallet (add)
    const destRef = doc(firestore, "wallets", destWalletId);
    const destSnap = await getDoc(destRef);
    if (!destSnap.exists()) return { success: false, msg: "Destination wallet not found" };
    const destData = destSnap.data() as WalletType;
    batch.update(destRef, {
      amount: (destData.amount || 0) + normalizedAmount,
      totalIncome: (destData.totalIncome || 0) + normalizedAmount,
    });

    // Shared reference so both legs are identifiable as a transfer pair
    const transferRef = doc(collection(firestore, "transactions")).id;
    const now = Timestamp.now();
    const transferDescription = note ? `Transfer: ${note}` : "Wallet Transfer";

    // Expense leg on source wallet
    const expenseRef = doc(firestore, "transactions", transferRef + "_out");
    batch.set(expenseRef, {
      type: "expense",
      category: "transfer",
      amount: normalizedAmount,
      walletId: sourceWalletId,
      uid,
      date: now,
      description: transferDescription,
      transferRef,
    });

    // Income leg on destination wallet
    const incomeRef = doc(firestore, "transactions", transferRef + "_in");
    batch.set(incomeRef, {
      type: "income",
      category: "transfer",
      amount: normalizedAmount,
      walletId: destWalletId,
      uid,
      date: now,
      description: transferDescription,
      transferRef,
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    const msg = error instanceof Error || error instanceof FirebaseError ? error.message : "Transfer failed";
    return { success: false, msg };
  }
};

/**
 * Creates a new financial transaction (income or expense) or updates an existing one.
 * It handles the atomic recalculation of wallet balances and optionally uploads receipt images to Cloudinary.
 * 
 * @param {Partial<TransactionType>} transactionData - The payload containing amount, type, category, and walletId.
 * @returns {Promise<ResponseType>} A success response containing the finalized transaction data.
 */
export const createOrUpdateTransaction = async (
  transactionData: Partial<TransactionType>
): Promise<ResponseType> => {
  try {
    let { id, type, walletId, image, amount } = transactionData;
    
    // Normalize persisted amount before relying on aggregate sums
    const normalizedAmount = Number(amount);
    if (isNaN(normalizedAmount) || normalizedAmount <= 0 || !walletId || !type) {
      return { success: false, msg: "Please fill all the required fields" };
    }
    
    // Ensure the payload has the numeric amount
    transactionData.amount = normalizedAmount;

    const batch = writeBatch(firestore);

    if (id) {
      // update existing transaction
      const oldTransactionSnapshot = await getDoc(
        doc(firestore, "transactions", id)
      );
      const oldTransaction = oldTransactionSnapshot.data() as TransactionType;
      const shouldRevertOriginal =
        oldTransaction.type !== type ||
        oldTransaction.amount !== amount ||
        oldTransaction.walletId !== walletId;
      if (shouldRevertOriginal) {
        let res = await revertAndUpdateWallets(
          oldTransaction,
          normalizedAmount,
          type,
          walletId,
          batch
        );
        if (!res.success) return res;
      }
    } else {
      // update wallet for new transaction
      let res = await updateWalletForNewTransaction(
        walletId!,
        normalizedAmount,
        type,
        batch
      );
      if (!res.success) return res;
    }

    if (image) {
      const imageUploadRes = await uploadFileToCloudinary(
        image,
        "transactions"
      );
      if (!imageUploadRes.success) {
        return {
          success: false,
          msg: imageUploadRes.msg || "Failed to upload receipt",
        };
      }
      transactionData.image = imageUploadRes.data;
    }

    const transactionRef = id
      ? doc(firestore, "transactions", id)
      : doc(collection(firestore, "transactions"));

    batch.set(transactionRef, transactionData, { merge: true }); // updates only the data provided

    await batch.commit();

    return {
      success: true,
      data: { ...transactionData, id: transactionRef.id },
    };
  } catch (error: any) {
    const msg = error instanceof Error || error instanceof FirebaseError ? error.message : "Failed to create/update transaction";
    return {
      success: false,
      msg
    };
  }
};

const updateWalletForNewTransaction = async (
  walletId: string,
  amount: number,
  type: string,
  batch: any
) => {
  try {
    const walletRef = doc(firestore, "wallets", walletId);
    const walletSnapshot = await getDoc(walletRef);
    if (!walletSnapshot.exists()) {
      return { success: false, msg: "Wallet not found" };
    }

    const walletData = walletSnapshot.data() as WalletType;

    if (type === "expense" && walletData.amount! - amount < 0) {
      return {
        success: false,
        msg: "Selected wallet don't have enough balance",
      };
    }

    const updateType = type === "income" ? "totalIncome" : "totalExpense";
    const updatedWalletAmount =
      type === "income"
        ? Number(walletData.amount) + amount
        : Number(walletData.amount) - amount;

    const updatedTotals =
      type === "income"
        ? Number(walletData.totalIncome) + amount
        : Number(walletData.totalExpense) + amount;

    batch.update(walletRef, {
      amount: updatedWalletAmount,
      [updateType]: updatedTotals,
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof FirebaseError ? error.message : (error as Error).message;
    return { success: false, msg };
  }
};

const revertAndUpdateWallets = async (
  oldTransaction: TransactionType,
  newTransactionAmount: number,
  newTransactionType: string,
  newWalletId: string,
  batch: any
) => {
  try {
    const originalWalletRef = doc(firestore, "wallets", oldTransaction.walletId!);
    const originalWalletSnapshot = await getDoc(originalWalletRef);

    const originalWallet = originalWalletSnapshot.data() as WalletType;

    const newWalletRef = doc(firestore, "wallets", newWalletId);
    let newWalletSnapshot = await getDoc(newWalletRef);

    let newWallet = newWalletSnapshot.data() as WalletType;

    const revertType =
      oldTransaction.type === "income" ? "totalIncome" : "totalExpense";
    const revertIncomeExpense: number =
      oldTransaction.type === "income"
        ? -Number(oldTransaction.amount!)
        : Number(oldTransaction.amount!);

    const revertedWalletAmount =
      Number(originalWallet.amount) + revertIncomeExpense;

    const revertedIncomeExpenseAmount =
      Number(originalWallet[revertType]) - Number(oldTransaction.amount!);

    if (newTransactionType === "expense") {
      // if user tries to convert income to expense on the same wallet
      // or if user tries to increase the expense amount and don't have enough balance

      if (
        oldTransaction.walletId === newWalletId &&
        revertedWalletAmount < newTransactionAmount
      ) {
        return {
          success: false,
          msg: "Selected wallet don't have enough balance",
        };
      }
      // if user tries to add expense from a new wallet but the wallet don't have enough balance
      if (oldTransaction.walletId !== newWalletId && newWallet.amount! < newTransactionAmount) {
        return {
          success: false,
          msg: "Selected wallet don't have enough balance",
        };
      }
    }

    batch.update(originalWalletRef, {
      amount: revertedWalletAmount,
      [revertType]: revertedIncomeExpenseAmount,
    });

    // revert completed
    //////////////////////////////////////////////////////////////////////////////////////

    // Since we are using batches, we can't refetch the newWallet and expect the updated value 
    // if the original and new wallet are the SAME wallet. 
    // We must calculate the final state manually if they are the same wallet!
    const isSameWallet = oldTransaction.walletId === newWalletId;

    const updateType =
      newTransactionType === "income" ? "totalIncome" : "totalExpense";

    const updatedTransactionAmount: number =
      newTransactionType === "income"
        ? Number(newTransactionAmount)
        : -Number(newTransactionAmount);

    const baseAmount = isSameWallet ? revertedWalletAmount : Number(newWallet.amount);
    const newWalletAmount = baseAmount + updatedTransactionAmount;

    // We must also handle if it's the same wallet AND the same updateType (e.g. income -> income)
    const baseIncomeExpenseAmount = (isSameWallet && revertType === updateType) 
        ? revertedIncomeExpenseAmount 
        : Number(newWallet[updateType] ?? 0);
        
    const newIncomeExpenseAmount =
      baseIncomeExpenseAmount + Number(newTransactionAmount);

    batch.update(newWalletRef, {
      amount: newWalletAmount,
      [updateType]: newIncomeExpenseAmount,
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof FirebaseError ? error.message : (error as Error).message;
    return { success: false, msg };
  }
};

/**
 * Deletes a transaction and automatically reverts the impact of the transaction on the associated wallet's balance.
 * 
 * @param {string} transactionId - The ID of the transaction to delete.
 * @param {string} walletId - The ID of the wallet the transaction belongs to.
 * @returns {Promise<{success: boolean, msg?: string}>} Success indicator and optional error message.
 */
export const deleteTransaction = async (
  transactionId: string,
  walletId: string
) => {
  try {
    const transactionRef = doc(firestore, "transactions", transactionId);
    const transactionSnapshot = await getDoc(transactionRef);

    if (!transactionSnapshot.exists()) {
      return { success: false, msg: "Transaction not found" };
    }

    const transactionData = transactionSnapshot.data() as TransactionType;

    const transactionType = transactionData?.type;
    const transactionAmount = transactionData?.amount;

    // fetch wallet to update amount, totalIncome or totalExpenses
    const walletRef = doc(firestore, "wallets", walletId);
    const walletSnapshot = await getDoc(walletRef);
    
    const batch = writeBatch(firestore);

    if (walletSnapshot.exists()) {
      const walletData = walletSnapshot.data() as WalletType;

      // check fields to be updated based on transaction type
      const updateType =
        transactionType === "income" ? "totalIncome" : "totalExpense";

      const newWalletAmount =
        walletData?.amount! -
        (transactionType === "income" ? transactionAmount : -transactionAmount);

      const newIncomeExpenseAmount =
        Number(walletData[updateType] ?? 0) - Number(transactionAmount ?? 0);

      batch.update(walletRef, {
        amount: newWalletAmount,
        [updateType]: newIncomeExpenseAmount,
      });
    }

    batch.delete(transactionRef);
    
    await batch.commit();

    return { success: true };
  } catch (error) {
    const msg = error instanceof FirebaseError ? error.message : (error as Error).message;
    return { success: false, msg };
  }
};