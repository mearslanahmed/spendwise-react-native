import { firestore, auth } from "@/config/firebase";
import { DebtItemType, ResponseType, WalletType } from "@/types";
import {
  collection,
  doc,
  getDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageService";
import { sanitizeErrorMessage } from "@/utils/common";

/**
 * Creates or updates a Debt (Lent or Borrowed) record in Firestore.
 * If syncWithWallet is true, atomically updates the linked wallet balance and
 * creates a matching cashflow transaction so wallet balances stay accurate.
 */
export const createOrUpdateDebt = async (
  debtData: Partial<DebtItemType>
): Promise<ResponseType> => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false, msg: "User not authenticated" };

    const normalizedAmount = Math.round(Number(debtData.amount) * 100) / 100;
    if (isNaN(normalizedAmount) || normalizedAmount <= 0) {
      return { success: false, msg: "Please enter a valid amount greater than 0" };
    }
    if (normalizedAmount > 1_000_000_000) {
      return { success: false, msg: "Amount exceeds maximum limit" };
    }

    if (!debtData.personName || !debtData.personName.trim()) {
      return { success: false, msg: "Please enter a person name" };
    }
    const cleanPersonName = debtData.personName.trim().slice(0, 100);

    let uploadedImageUrl: string | null = null;
    if (debtData.image) {
      if (typeof debtData.image === "object") {
        const uploadRes = await uploadFileToCloudinary(debtData.image, "debts", uid);
        if (!uploadRes.success) {
          return {
            success: false,
            msg: sanitizeErrorMessage(uploadRes.msg, "Failed to upload receipt image. Please try again."),
          };
        }
        uploadedImageUrl = uploadRes.data;
      } else if (typeof debtData.image === "string") {
        uploadedImageUrl = debtData.image;
      }
    }

    const batch = writeBatch(firestore);

    if (!debtData.id) {
      // NEW DEBT RECORD
      const debtRef = doc(collection(firestore, "debts"));
      const debtDate = debtData.date
        ? (debtData.date instanceof Date ? Timestamp.fromDate(debtData.date) : debtData.date)
        : Timestamp.now();

      const debtToSave: any = {
        id: debtRef.id,
        uid,
        personName: cleanPersonName,
        type: debtData.type || "lent",
        amount: normalizedAmount,
        remainingAmount: normalizedAmount,
        settledAmount: 0,
        status: "pending",
        settlements: [],
        syncWithWallet: !!debtData.syncWithWallet,
        date: debtDate,
        createdAt: Timestamp.now(),
        description: debtData.description ? debtData.description.trim() : "",
      };

      if (debtData.dueDate) {
        debtToSave.dueDate =
          debtData.dueDate instanceof Date
            ? Timestamp.fromDate(debtData.dueDate)
            : debtData.dueDate;
      }

      if (debtData.walletId) {
        debtToSave.walletId = debtData.walletId;
      }

      if (uploadedImageUrl) {
        debtToSave.image = uploadedImageUrl;
      }

      // If user enabled "Affect Wallet Balance", update the linked wallet
      if (debtData.syncWithWallet && debtData.walletId) {
        const walletRef = doc(firestore, "wallets", debtData.walletId);
        const walletSnap = await getDoc(walletRef);
        if (walletSnap.exists()) {
          const walletData = walletSnap.data() as WalletType;
          if (walletData.uid !== uid) {
            return { success: false, msg: "Unauthorized wallet access" };
          }
          const currentBal = Number(walletData.amount || 0);

          if (debtData.type === "lent") {
            // Check insufficient balance before deducting
            if (currentBal < normalizedAmount) {
              return {
                success: false,
                msg: `Selected wallet doesn't have enough balance (Available: ${currentBal.toFixed(2)})`,
              };
            }

            // Money given out: deduct from wallet
            batch.update(walletRef, {
              amount: currentBal - normalizedAmount,
              totalExpense: Number(walletData.totalExpense || 0) + normalizedAmount,
            });

            // Log corresponding transaction
            const txRef = doc(collection(firestore, "transactions"));
            batch.set(txRef, {
              id: txRef.id,
              type: "expense",
              category: "transfer",
              amount: normalizedAmount,
              walletId: debtData.walletId,
              uid,
              date: debtDate,
              description: `Lent to ${debtToSave.personName}${debtToSave.description ? `: ${debtToSave.description}` : ""}`,
            });
          } else {
            // Money received (borrowed): add to wallet
            batch.update(walletRef, {
              amount: currentBal + normalizedAmount,
              totalIncome: Number(walletData.totalIncome || 0) + normalizedAmount,
            });

            // Log corresponding transaction
            const txRef = doc(collection(firestore, "transactions"));
            batch.set(txRef, {
              id: txRef.id,
              type: "income",
              category: "transfer",
              amount: normalizedAmount,
              walletId: debtData.walletId,
              uid,
              date: debtDate,
              description: `Borrowed from ${debtToSave.personName}${debtToSave.description ? `: ${debtToSave.description}` : ""}`,
            });
          }
        }
      }

      // Safety scrub: eliminate any undefined value
      Object.keys(debtToSave).forEach((key) => {
        if (debtToSave[key] === undefined) {
          delete debtToSave[key];
        }
      });

      batch.set(debtRef, debtToSave);
      await batch.commit();
      return { success: true, data: debtToSave };
    } else {
      // UPDATE EXISTING RECORD (Update description, dueDate, personName, amount, image)
      const debtRef = doc(firestore, "debts", debtData.id);
      const debtSnap = await getDoc(debtRef);
      if (!debtSnap.exists()) return { success: false, msg: "Debt record not found" };
      const existing = debtSnap.data() as DebtItemType;
      if (existing.uid !== uid) return { success: false, msg: "Unauthorized access to debt record" };

      const updates: any = {};
      if (debtData.personName && debtData.personName.trim()) {
        updates.personName = debtData.personName.trim().slice(0, 100);
      }
      if (debtData.description !== undefined) {
        updates.description = debtData.description ? debtData.description.trim() : "";
      }
      if (debtData.dueDate !== undefined) {
        updates.dueDate = debtData.dueDate === null
          ? null
          : (debtData.dueDate instanceof Date ? Timestamp.fromDate(debtData.dueDate) : debtData.dueDate);
      }
      if (debtData.amount !== undefined) {
        const newAmount = Math.round(Number(debtData.amount) * 100) / 100;
        if (isNaN(newAmount) || newAmount <= 0) {
          return { success: false, msg: "Please enter a valid amount greater than 0" };
        }

        const currentSettled = Math.round(Number(existing.settledAmount || 0) * 100) / 100;
        if (newAmount < currentSettled) {
          return {
            success: false,
            msg: `Total amount cannot be less than already settled repayments ($${currentSettled.toFixed(2)})`,
          };
        }

        const rawRemaining = newAmount - currentSettled;
        const newRemaining = rawRemaining <= 0.005 ? 0 : Math.round(rawRemaining * 100) / 100;
        updates.amount = newAmount;
        updates.remainingAmount = newRemaining;
        updates.status = newRemaining <= 0 ? "settled" : "pending";

        // Keep linked wallet in sync with any change in the principal amount
        const oldAmount = Math.round(Number(existing.amount || 0) * 100) / 100;
        const amountDiff = Math.round((newAmount - oldAmount) * 100) / 100;

        if (existing.syncWithWallet && existing.walletId && amountDiff !== 0) {
          const walletRef = doc(firestore, "wallets", existing.walletId);
          const walletSnap = await getDoc(walletRef);
          if (walletSnap.exists()) {
            const walletData = walletSnap.data() as WalletType;
            if (walletData.uid !== uid) {
              return { success: false, msg: "Unauthorized wallet access" };
            }
            const currentBal = Number(walletData.amount || 0);

            if (existing.type === "lent") {
              // Increased loan: deduct difference from wallet (check balance!)
              // Decreased loan: add difference back to wallet
              if (amountDiff > 0 && currentBal < amountDiff) {
                return {
                  success: false,
                  msg: `Cannot increase loan by $${amountDiff.toFixed(2)}: wallet balance is only $${currentBal.toFixed(2)}`,
                };
              }

              batch.update(walletRef, {
                amount: currentBal - amountDiff,
                totalExpense: Math.max(0, Number(walletData.totalExpense || 0) + amountDiff),
              });
            } else {
              // Increased borrow: add difference to wallet
              // Decreased borrow: deduct difference from wallet (check balance!)
              if (amountDiff < 0 && currentBal < Math.abs(amountDiff)) {
                return {
                  success: false,
                  msg: `Cannot decrease borrow amount: wallet balance is only $${currentBal.toFixed(2)}`,
                };
              }

              batch.update(walletRef, {
                amount: currentBal + amountDiff,
                totalIncome: Math.max(0, Number(walletData.totalIncome || 0) + amountDiff),
              });
            }
          }
        }
      }
      if (uploadedImageUrl) {
        updates.image = uploadedImageUrl;
      }

      // Safety scrub: eliminate any undefined value
      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      batch.update(debtRef, updates);
      await batch.commit();
      return { success: true, data: { id: debtData.id, ...updates } };
    }
  } catch (error: any) {
    console.error("createOrUpdateDebt error:", error);
    return {
      success: false,
      msg: sanitizeErrorMessage(error, "Failed to save debt record. Please check the details and try again."),
    };
  }
};

/**
 * Settles a full or partial debt payment.
 * Updates settledAmount, remainingAmount, and status on the debt record.
 * If syncWithWallet is true, atomically updates the destination wallet.
 */
export const settleDebt = async (
  debtId: string,
  settleAmount: number,
  destinationWalletId?: string,
  syncWithWallet?: boolean,
  notes?: string
): Promise<ResponseType> => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false, msg: "User not authenticated" };

    const parsedSettleAmount = Math.round(Number(settleAmount) * 100) / 100;
    if (isNaN(parsedSettleAmount) || parsedSettleAmount <= 0) {
      return { success: false, msg: "Please enter a valid repayment amount greater than 0" };
    }

    const debtRef = doc(firestore, "debts", debtId);
    const debtSnap = await getDoc(debtRef);
    if (!debtSnap.exists()) return { success: false, msg: "Debt record not found" };

    const debtData = debtSnap.data() as DebtItemType;
    if (debtData.uid !== uid) return { success: false, msg: "Unauthorized access to debt record" };
    const remaining = Math.round(Number(debtData.remainingAmount || 0) * 100) / 100;

    if (debtData.status === "settled" || remaining <= 0.005) {
      return { success: false, msg: "This debt has already been fully settled." };
    }

    if (parsedSettleAmount > remaining + 0.005) {
      return {
        success: false,
        msg: `Payment amount cannot exceed the remaining balance of $${remaining.toFixed(2)}`,
      };
    }

    const effectiveSettleAmount = Math.min(parsedSettleAmount, remaining);
    const newSettledAmount = Math.round((Number(debtData.settledAmount || 0) + effectiveSettleAmount) * 100) / 100;
    const rawRemaining = remaining - effectiveSettleAmount;
    const newRemainingAmount = rawRemaining <= 0.005 ? 0 : Math.round(rawRemaining * 100) / 100;
    const newStatus = newRemainingAmount <= 0 ? "settled" : "pending";

    const settlementEntry: any = {
      id: doc(collection(firestore, "debts")).id,
      amount: effectiveSettleAmount,
      date: Timestamp.now(),
    };
    if (destinationWalletId) {
      settlementEntry.walletId = destinationWalletId;
    }
    if (notes && notes.trim()) {
      settlementEntry.notes = notes.trim();
    }

    const updatedSettlements = [...(debtData.settlements || []), settlementEntry];

    const batch = writeBatch(firestore);

    // Update the Debt document
    batch.update(debtRef, {
      settledAmount: newSettledAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      settlements: updatedSettlements,
    });

    // If syncing with a wallet on settlement
    if (syncWithWallet && destinationWalletId) {
      const walletRef = doc(firestore, "wallets", destinationWalletId);
      const walletSnap = await getDoc(walletRef);

      if (walletSnap.exists()) {
        const walletData = walletSnap.data() as WalletType;
        if (walletData.uid !== uid) {
          return { success: false, msg: "Unauthorized wallet access" };
        }
        const currentBal = Number(walletData.amount || 0);

        if (debtData.type === "lent") {
          // You lent money and someone repaid you: money comes IN to your wallet
          batch.update(walletRef, {
            amount: currentBal + effectiveSettleAmount,
            totalIncome: Number(walletData.totalIncome || 0) + effectiveSettleAmount,
          });

          // Log transaction
          const txRef = doc(collection(firestore, "transactions"));
          batch.set(txRef, {
            id: txRef.id,
            type: "income",
            category: "transfer",
            amount: effectiveSettleAmount,
            walletId: destinationWalletId,
            uid,
            date: Timestamp.now(),
            description: `Repayment from ${debtData.personName}${notes ? `: ${notes}` : ""}`,
          });
        } else {
          // You borrowed money and you repaid them: money goes OUT of your wallet
          if (currentBal < effectiveSettleAmount) {
            return {
              success: false,
              msg: `Selected wallet doesn't have enough balance for repayment (Available: ${currentBal.toFixed(2)})`,
            };
          }

          batch.update(walletRef, {
            amount: currentBal - effectiveSettleAmount,
            totalExpense: Number(walletData.totalExpense || 0) + effectiveSettleAmount,
          });

          // Log transaction
          const txRef = doc(collection(firestore, "transactions"));
          batch.set(txRef, {
            id: txRef.id,
            type: "expense",
            category: "transfer",
            amount: effectiveSettleAmount,
            walletId: destinationWalletId,
            uid,
            date: Timestamp.now(),
            description: `Repayment to ${debtData.personName}${notes ? `: ${notes}` : ""}`,
          });
        }
      }
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("settleDebt error:", error);
    return {
      success: false,
      msg: sanitizeErrorMessage(error, "Failed to record settlement. Please try again."),
    };
  }
};

/**
 * Deletes a debt record.
 * Optionally allows reverting the wallet balance if it had previously affected a wallet.
 */
export const deleteDebt = async (
  debtId: string,
  refundWallet: boolean = false
): Promise<ResponseType> => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false, msg: "User not authenticated" };

    const debtRef = doc(firestore, "debts", debtId);
    const debtSnap = await getDoc(debtRef);
    if (!debtSnap.exists()) return { success: false, msg: "Debt record not found" };

    const debtData = debtSnap.data() as DebtItemType;
    if (debtData.uid !== uid) return { success: false, msg: "Unauthorized access to debt record" };
    const batch = writeBatch(firestore);

    // If user requested to refund/revert the wallet adjustment
    if (refundWallet && debtData.syncWithWallet && debtData.walletId) {
      const walletRef = doc(firestore, "wallets", debtData.walletId);
      const walletSnap = await getDoc(walletRef);
      if (walletSnap.exists()) {
        const walletData = walletSnap.data() as WalletType;
        if (walletData.uid !== uid) {
          return { success: false, msg: "Unauthorized wallet access" };
        }
        const currentBal = Number(walletData.amount || 0);

        // Revert ONLY the outstanding unpaid amount to avoid duplicate refunds!
        const amountToRevert = Math.round(Number(debtData.remainingAmount || 0) * 100) / 100;

        if (amountToRevert > 0) {
          if (debtData.type === "lent") {
            // Revert: return the outstanding lent money back into the wallet
            batch.update(walletRef, {
              amount: currentBal + amountToRevert,
              totalExpense: Math.max(0, Number(walletData.totalExpense || 0) - amountToRevert),
            });
          } else {
            // Revert: deduct the outstanding borrowed money that was deposited
            if (currentBal < amountToRevert) {
              return {
                success: false,
                msg: `Cannot revert wallet: balance ($${currentBal.toFixed(2)}) is lower than the amount to deduct ($${amountToRevert.toFixed(2)})`,
              };
            }

            batch.update(walletRef, {
              amount: currentBal - amountToRevert,
              totalIncome: Math.max(0, Number(walletData.totalIncome || 0) - amountToRevert),
            });
          }
        }
      }
    }

    batch.delete(debtRef);
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("deleteDebt error:", error);
    return {
      success: false,
      msg: sanitizeErrorMessage(error, "Failed to delete debt record. Please try again."),
    };
  }
};
