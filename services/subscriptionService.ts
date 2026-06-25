import { firestore } from "@/config/firebase";
import { ResponseType, SubscriptionType, TransactionType, WalletType } from "@/types";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, Timestamp, updateDoc, where, writeBatch } from "firebase/firestore";

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
    const currency = userDoc.exists() ? userDoc.data()?.currency || "$" : "$";

    const q = query(collection(firestore, "subscriptions"), where("uid", "==", uid), where("autoDeduct", "==", true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const now = new Date();
    const batch = writeBatch(firestore);
    let processedCount = 0;

    for (const docSnap of snapshot.docs) {
      const sub = { id: docSnap.id, ...docSnap.data() } as SubscriptionType;
      
      const nextBilling = (sub.nextBillingDate as any)?.toDate ? (sub.nextBillingDate as any).toDate() : new Date(sub.nextBillingDate as string);
      const lastNotified = sub.lastNotified && (sub.lastNotified as any).toDate ? (sub.lastNotified as any).toDate() : null;
      const isNotifiedToday = lastNotified && lastNotified.toDateString() === now.toDateString();

      // If billing date has passed or is today
      if (nextBilling.getTime() <= now.getTime()) {
        const walletRef = doc(firestore, "wallets", sub.walletId);
        const walletSnap = await getDoc(walletRef);
        
        if (walletSnap.exists()) {
          const walletData = walletSnap.data() as WalletType;
          if ((walletData.amount || 0) < sub.amount) {
            // Insufficient funds: Don't deduct.
            // To avoid spamming every time the app opens, check if we already notified today.
            
            if (!isNotifiedToday) {
              const notifRef = doc(collection(firestore, "notifications"));
              batch.set(notifRef, {
                uid: uid,
                title: "Subscription Failed",
                message: `Insufficient funds in wallet for ${sub.name}. Please transfer money to avoid bounced transactions.`,
                createdAt: Timestamp.fromDate(now),
                read: false,
                type: "subscription"
              });

              // Mark that we notified them today
              batch.update(doc(firestore, "subscriptions", sub.id!), {
                lastNotified: Timestamp.fromDate(now),
              });
              processedCount++;
            }
          } else {
            // 1. Create Transaction
            const txRef = doc(collection(firestore, "transactions"));
            batch.set(txRef, {
              type: "expense",
              category: sub.category,
              amount: sub.amount,
              walletId: sub.walletId,
              uid: uid,
              date: Timestamp.fromDate(now),
              description: `Auto-deducted subscription: ${sub.name}`,
            });

            // 2. Update Wallet
            batch.update(walletRef, {
              amount: (walletData.amount || 0) - sub.amount,
              totalExpense: (walletData.totalExpense || 0) + sub.amount,
            });

            // 3. Update Subscription nextBillingDate
            const nextDate = calculateNextBillingDate(nextBilling, sub.frequency);
            batch.update(doc(firestore, "subscriptions", sub.id!), {
              nextBillingDate: Timestamp.fromDate(nextDate),
              lastNotified: null, // reset
            });

            // 4. Create Notification
            const notifRef = doc(collection(firestore, "notifications"));
            batch.set(notifRef, {
              uid: uid,
              title: "Subscription Processed",
              message: `Your ${sub.frequency} subscription for ${sub.name} was successfully paid.`,
              createdAt: Timestamp.fromDate(now),
              read: false,
              type: "subscription"
            });

            processedCount++;
          }
        }
      } 
      // If billing date is tomorrow (within 24-48 hours ideally, but let's just check if it's <= 1 day away)
      else {
        const timeDiff = nextBilling.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1 && !isNotifiedToday) {
          const notifRef = doc(collection(firestore, "notifications"));
          batch.set(notifRef, {
            uid: uid,
            title: "Upcoming Bill Reminder",
            message: `Your ${sub.name} subscription (${currency}${sub.amount.toFixed(2)}) is due tomorrow. Make sure your wallet has enough funds!`,
            createdAt: Timestamp.fromDate(now),
            read: false,
            type: "reminder"
          });

          // Mark that we notified them today
          batch.update(doc(firestore, "subscriptions", sub.id!), {
            lastNotified: Timestamp.fromDate(now),
          });
          processedCount++;
        }
      }
    }

    if (processedCount > 0) {
      await batch.commit();
      console.log(`Successfully processed ${processedCount} due subscriptions.`);
    }

  } catch (error) {
    console.error("Error processing subscriptions:", error);
  }
};
