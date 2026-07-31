import { firestore } from "@/config/firebase";
import { ResponseType, SubscriptionType, WalletType } from "@/types";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, Timestamp, updateDoc, where, runTransaction } from "firebase/firestore";
import { scheduleLocalNotification } from "./expoNotificationService";
import { resolveDate } from "@/utils/dateHelper";

export const createSubscription = async (sub: Omit<SubscriptionType, "id">): Promise<ResponseType> => {
  try {
    const docRef = await addDoc(collection(firestore, "subscriptions"), sub);
    return { success: true, data: { ...sub, id: docRef.id } };
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return { success: false, msg: error.message };
  }
};

export const updateSubscription = async (subId: string, updates: Partial<SubscriptionType>): Promise<ResponseType> => {
  try {
    const ref = doc(firestore, "subscriptions", subId);
    await updateDoc(ref, updates);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return { success: false, msg: error.message };
  }
};

export const deleteSubscription = async (subId: string): Promise<ResponseType> => {
  try {
    await deleteDoc(doc(firestore, "subscriptions", subId));
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting subscription:", error);
    return { success: false, msg: error.message };
  }
};

export const calculateNextBillingDate = (date: Date, frequency: "weekly" | "monthly" | "yearly"): Date => {
  const newDate = new Date(date);
  if (frequency === "weekly") {
    newDate.setDate(newDate.getDate() + 7);
  } else if (frequency === "monthly") {
    newDate.setMonth(newDate.getMonth() + 1);
  } else if (frequency === "yearly") {
    newDate.setFullYear(newDate.getFullYear() + 1);
  }
  return newDate;
};

export const checkAndProcessSubscriptions = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(firestore, "users", uid));
    const pushEnabled = userDoc.exists() ? userDoc.data()?.pushNotificationsEnabled : false;
    const currency = userDoc.exists() ? userDoc.data()?.currency || "$" : "$";

    const q = query(collection(firestore, "subscriptions"), where("uid", "==", uid));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const now = new Date();

    for (const docSnap of snapshot.docs) {
      const subId = docSnap.id;
      const subRef = doc(firestore, "subscriptions", subId);

      await runTransaction(firestore, async (transaction) => {
        const currentSubSnap = await transaction.get(subRef);
        if (!currentSubSnap.exists()) return;
        
        const sub = currentSubSnap.data() as SubscriptionType;
        const nextBilling = resolveDate(sub.nextBillingDate);
        const lastNotified = sub.lastNotified ? resolveDate(sub.lastNotified) : null;
        const isNotifiedToday = lastNotified && lastNotified.toDateString() === now.toDateString();

        // If another process already advanced the billing date beyond today, skip.
        if (nextBilling.getTime() > now.getTime()) {
          // Check if billing date is exactly tomorrow (within 1 day) for the reminder.
          const timeDiff = nextBilling.getTime() - now.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1 && !isNotifiedToday) {
            const notifRef = doc(collection(firestore, "notifications"));
            transaction.set(notifRef, {
              uid: uid,
              title: sub.autoDeduct ? "Upcoming Auto-Pay Bill" : "Upcoming Manual Bill",
              message: sub.autoDeduct 
                ? `Your ${sub.name} auto-pay bill (${currency}${sub.amount.toFixed(2)}) is due tomorrow.`
                : `Your manual bill ${sub.name} (${currency}${sub.amount.toFixed(2)}) is due tomorrow. Please pay it manually!`,
              createdAt: Timestamp.fromDate(now),
              read: false,
              type: "reminder"
            });

            transaction.update(subRef, {
              lastNotified: Timestamp.fromDate(now),
            });

            if (pushEnabled) {
              scheduleLocalNotification(
                sub.autoDeduct ? "Upcoming Auto-Pay Bill 📅" : "Upcoming Manual Bill 📅", 
                `Your ${sub.name} is due tomorrow.`
              );
            }
          }
          return;
        }

        // If manual bill is due now / overdue, remind them and do not auto-deduct.
        if (!sub.autoDeduct) {
          if (!isNotifiedToday) {
            const notifRef = doc(collection(firestore, "notifications"));
            transaction.set(notifRef, {
              uid: uid,
              title: "Manual Bill Overdue ⚠️",
              message: `Your manual bill ${sub.name} (${currency}${sub.amount.toFixed(2)}) is due. Please remember to pay it!`,
              createdAt: Timestamp.fromDate(now),
              read: false,
              type: "reminder"
            });

            transaction.update(subRef, {
              lastNotified: Timestamp.fromDate(now),
            });

            if (pushEnabled) {
              scheduleLocalNotification("Manual Bill Overdue ⚠️", `Please remember to pay ${sub.name}.`);
            }
          }
          return;
        }

        const walletRef = doc(firestore, "wallets", sub.walletId);
        const walletSnap = await transaction.get(walletRef);
        
        if (!walletSnap.exists()) return; // Wallet was deleted, nothing to deduct from
        
        const walletData = walletSnap.data() as WalletType;
        
        let currentWalletAmount = walletData.amount || 0;
        let currentTotalExpense = walletData.totalExpense || 0;
        let processingDate = new Date(nextBilling);
        let processedCount = 0;
        let insufficientFunds = false;

        // Process all missed cycles
        while (processingDate.getTime() <= now.getTime()) {
          if (currentWalletAmount < sub.amount) {
            insufficientFunds = true;
            break;
          }

          // 1. Create Transaction for this cycle
          const txRef = doc(collection(firestore, "transactions"));
          transaction.set(txRef, {
            type: "expense",
            category: sub.category,
            amount: sub.amount,
            walletId: sub.walletId,
            uid: uid,
            date: Timestamp.fromDate(processingDate),
            description: `Auto-deducted subscription: ${sub.name}`,
          });

          currentWalletAmount -= sub.amount;
          currentTotalExpense += sub.amount;
          processedCount++;

          // Advance to next billing date
          processingDate = calculateNextBillingDate(processingDate, sub.frequency);
        }

        if (insufficientFunds) {
          // Insufficient funds
          if (!isNotifiedToday) {
            const notifRef = doc(collection(firestore, "notifications"));
            transaction.set(notifRef, {
              uid: uid,
              title: "Subscription Failed",
              message: `Insufficient funds in wallet for ${sub.name}. Please transfer money to avoid bounced transactions.`,
              createdAt: Timestamp.fromDate(now),
              read: false,
              type: "subscription"
            });
            
            transaction.update(subRef, {
              lastNotified: Timestamp.fromDate(now),
            });

            if (pushEnabled) {
              scheduleLocalNotification("Subscription Failed 💳", `Insufficient funds for ${sub.name}.`);
            }
          }
        } else if (processedCount > 0) {
          // 2. Update Wallet
          transaction.update(walletRef, {
            amount: currentWalletAmount,
            totalExpense: currentTotalExpense,
          });

          // 3. Update Subscription nextBillingDate
          transaction.update(subRef, {
            nextBillingDate: Timestamp.fromDate(processingDate),
            lastNotified: null, // reset
          });

          // 4. Create Notification
          const notifRef = doc(collection(firestore, "notifications"));
          transaction.set(notifRef, {
            uid: uid,
            title: "Subscription Processed",
            message: `Your ${sub.frequency} subscription for ${sub.name} was successfully paid${processedCount > 1 ? ` (${processedCount} cycles)` : ''}.`,
            createdAt: Timestamp.fromDate(now),
            read: false,
            type: "subscription"
          });

          if (pushEnabled) {
            scheduleLocalNotification("Subscription Processed ✅", `Successfully paid ${sub.name}.`);
          }
        }
      });
    }

  } catch (error) {
    console.error("Error processing subscriptions:", error);
  }
};

export const paySubscriptionManually = async (subId: string, overrideAmount?: number): Promise<ResponseType> => {
  try {
    const subRef = doc(firestore, "subscriptions", subId);
    
    const result = await runTransaction(firestore, async (transaction) => {
      const subSnap = await transaction.get(subRef);
      if (!subSnap.exists()) {
        return { success: false, msg: "Subscription not found" };
      }
      
      const sub = subSnap.data() as SubscriptionType;
      const nextBilling = resolveDate(sub.nextBillingDate);
      
      const walletRef = doc(firestore, "wallets", sub.walletId);
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) {
        return { success: false, msg: "Associated wallet not found" };
      }
      
      const walletData = walletSnap.data() as WalletType;
      const walletAmount = walletData.amount || 0;
      const totalExpense = walletData.totalExpense || 0;
      
      const payAmount = overrideAmount !== undefined && overrideAmount > 0 ? overrideAmount : sub.amount;
      
      if (walletAmount < payAmount) {
        return { success: false, msg: "Insufficient funds in the wallet" };
      }
      
      const now = new Date();
      
      // 1. Create Transaction for this payment
      const txRef = doc(collection(firestore, "transactions"));
      transaction.set(txRef, {
        type: "expense",
        category: sub.category,
        amount: payAmount,
        walletId: sub.walletId,
        uid: sub.uid,
        date: Timestamp.fromDate(now),
        description: `Manual subscription payment: ${sub.name}`,
      });
      
      // 2. Update Wallet balance
      transaction.update(walletRef, {
        amount: walletAmount - payAmount,
        totalExpense: totalExpense + payAmount,
      });
      
      // 3. Update Subscription nextBillingDate
      const advancedBillingDate = calculateNextBillingDate(nextBilling, sub.frequency);
      transaction.update(subRef, {
        nextBillingDate: Timestamp.fromDate(advancedBillingDate),
        lastNotified: null,
      });
      
      return { success: true, msg: `Successfully paid ${sub.name}` };
    });
    
    return result;
  } catch (error: any) {
    console.error("Error paying subscription manually:", error);
    return { success: false, msg: error.message || "Failed to process manual payment" };
  }
};
