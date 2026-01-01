import { firestore } from "@/config/firebase";
import { TransactionType, WalletType, ResponseType } from "@/types";
import { collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageService";
import { CreateOrUpdateWallet } from "./walletService";

export const createOrUpdateTransaction = async (
  transactionData: Partial<TransactionType>
): Promise<ResponseType> => {
  try {
    const { id, type, walletId, image, amount } = transactionData;
    if (!amount || amount <= 0 || !walletId || !type) {
      return { success: false, msg: "Please fill all the required fields" };
    }
    if (id) {
      // update existing transaction
        const oldTransactionSnapshot = await getDoc(doc(firestore, "transactions", id));
        const oldTransaction = oldTransactionSnapshot.data() as TransactionType;
        const shouldRevertOriginal = 
            oldTransaction.type != type ||
            oldTransaction.amount != amount ||
            oldTransaction.walletId != walletId;
            if(shouldRevertOriginal){
                let res = await revertAndUpdateWallets(oldTransaction, Number(amount), type, walletId);
                if(!res.success) return res;
            }
    } else {
      // update wallet for new transaction
      let res = await updateWalletForNewTransaction(
        walletId!,
        Number(amount!),
        type
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

    await setDoc(transactionRef, transactionData, { merge: true }); // updates only the data provided

    return {
      success: true,
      data: { ...transactionData, id: transactionRef.id },
    };
  } catch (error: any) {
    console.log("Error creating/updating transaction:", error);
    return {
      success: false,
      msg: error.message || "Failed to create/update transaction",
    };
  }
};

const updateWalletForNewTransaction = async (
  walletId: string,
  amount: number,
  type: string
) => {
  try {
    const walletRef = doc(firestore, "wallets", walletId);
    const walletSnapshot = await getDoc(walletRef);
    if (!walletSnapshot.exists()) {
      console.log("error updating wallet for new transaction");
      return { success: false, msg: "Wallet not found" };
    }

    const walletData = walletSnapshot.data() as WalletType;

    if (type == "expense" && walletData.amount! - amount < 0) {
      return {
        success: false,
        msg: "Selected wallet don't have enough balance",
      };
    }

    const updateType = type == "income" ? "totalIncome" : "totalExpense";
    const updatedWalletAmount =
      type == "income"
        ? Number(walletData.amount) + amount
        : Number(walletData.amount) - amount;

    const updatedTotals =
      type == "income"
        ? Number(walletData.totalIncome) + amount
        : Number(walletData.totalExpense) + amount;

    await updateDoc(walletRef, {
      amount: updatedWalletAmount,
      [updateType]: updatedTotals,
    });

    return { success: true };
  } catch (err: any) {
    console.log("error updating wallet for new transaction: ", err);
    return { success: false, msg: err.message };
  }
};

const revertAndUpdateWallets = async (
  oldTransaction: TransactionType,
  newTransactionAmount: number,
  newTransactionType: string,
  newWalletId: string
) => {
  try {
    const originalWalletSnapshot = await getDoc(
      doc(firestore, "wallets", oldTransaction.walletId!)
    );

    const originalWallet = originalWalletSnapshot.data() as WalletType;
    const originalWalletId = originalWalletSnapshot.id;

    let newWalletSnapshot = await getDoc(
      doc(firestore, "wallets", newWalletId)
    );

    let newWallet = newWalletSnapshot.data() as WalletType;
    const newWalletDocId = newWalletSnapshot.id;

    const revertType = oldTransaction.type == "income" ? "totalIncome" : "totalExpense";
    const revertIncomeExpense: number = oldTransaction.type == "income"
        ? -Number(oldTransaction.amount!)
        :  Number(oldTransaction.amount!);
      
    const revertedWalletAmount = 
        Number(originalWallet.amount) + revertIncomeExpense;

    const revertedIncomeExpenseAmount = 
        Number(originalWallet[revertType]) - Number(oldTransaction.amount!);

        if(newTransactionType == 'expense'){
            // if user tries to convert income to expense on the same wallet
            // or if user tries to increase the expense amount and don't have enough balance

            if(
                oldTransaction.walletId == newWalletId &&
                revertedWalletAmount < newTransactionAmount
            ){
                return {
                    success: false,
                    msg: "Selected wallet don't have enough balance",
                };
            }
            // if user tries to add expense from a new wallet but the wallet don't have enough balance
            if(newWallet.amount! < newTransactionAmount){
                return {
                    success: false,
                    msg: "Selected wallet don't have enough balance",
                };
            }
        }

        await CreateOrUpdateWallet({
          id: originalWalletId,
          amount: revertedWalletAmount,
          [revertType]: revertedIncomeExpenseAmount,
        });

        // revert completed
    //////////////////////////////////////////////////////////////////////////////////////

    // refetch the newWallet because we might have just updated it
    newWalletSnapshot = await getDoc(
        doc(firestore, "wallets", newWalletId)
    );

    newWallet = newWalletSnapshot.data() as WalletType;

    const updateType = newTransactionType === 'income' ? "totalIncome" : "totalExpense";

    const updatedTransactionAmount: number =
        newTransactionType == "income"
        ? Number(newTransactionAmount)
        : - Number(newTransactionAmount);
    
    const newWalletAmount = Number(newWallet.amount) + updatedTransactionAmount;

    const newIncomeExpenseAmount = Number(newWallet[updateType] ?? 0) + Number(newTransactionAmount);
    
    await CreateOrUpdateWallet({
      id: newWalletDocId,
      amount: newWalletAmount,
      [updateType]: newIncomeExpenseAmount,
    })

    return { success: true };

  } catch (err: any) {
    console.log("error updating wallet for new transaction: ", err);
    return { success: false, msg: err.message };
  }
};

export const deleteTransaction = async (
  transactionId: string,
  walletId: string
) => {
  try {

    const transactionRef = doc(firestore, "transactions", transactionId);
    const transactionSnapshot = await getDoc(transactionRef);

    if(!transactionSnapshot.exists()){
      return { success: false, msg: "Transaction not found" };
    }

    const transactionData = transactionSnapshot.data() as TransactionType;

    const transactionType = transactionData?.type;
    const transactionAmount = transactionData?.amount;

    // fetch wallet to update amount, totalIncome or totalExpenses
    const walletSnapshot = await getDoc(
        doc(firestore, "wallets", walletId)
    );
    const walletData = walletSnapshot.data() as WalletType;

    // check fields to be updated based on transaction type
    const updateType =
      transactionType === "income" ? "totalIncome" : "totalExpense";

    const newWalletAmount =
      walletData?.amount! -
      (transactionType == "income" ? transactionAmount : -transactionAmount);

    const newIncomeExpenseAmount = Number(walletData[updateType] ?? 0) - Number(transactionAmount ?? 0);

    // if its expense and the wallet amount can go below zero
    if (transactionType == 'expense' && newWalletAmount < 0) {
      return { success: false, msg: "You cannot delete this transaction" };
    }

    await CreateOrUpdateWallet({
      id: walletId,
      amount: newWalletAmount,
      [updateType]: newIncomeExpenseAmount
    });

    await deleteDoc(transactionRef);

    return { success: true };
  } catch (err: any) {
    console.log("error updating wallet for new transaction: ", err);
    return { success: false, msg: err.message };
  }
};