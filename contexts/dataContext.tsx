import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { TransactionType, BudgetType, WalletType, NotificationType, SubscriptionType } from "@/types";
import { checkAndProcessSubscriptions } from "@/services/subscriptionService";
import { resolveTime } from "@/utils/dateHelper";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DataContextType {
  transactions: TransactionType[];
  budgets: BudgetType[];
  wallets: WalletType[];
  notifications: NotificationType[];
  subscriptions: SubscriptionType[];
  loading: {
    transactions: boolean;
    budgets: boolean;
    wallets: boolean;
    notifications: boolean;
    subscriptions: boolean;
  };
  error: {
    transactions: string | null;
    budgets: string | null;
    wallets: string | null;
    notifications: string | null;
    subscriptions: string | null;
  };
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionType[]>([]);

  const [loading, setLoading] = useState({
    transactions: true,
    budgets: true,
    wallets: true,
    notifications: true,
    subscriptions: true,
  });

  const [error, setError] = useState<{
    transactions: string | null;
    budgets: string | null;
    wallets: string | null;
    notifications: string | null;
    subscriptions: string | null;
  }>({
    transactions: null,
    budgets: null,
    wallets: null,
    notifications: null,
    subscriptions: null,
  });

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setBudgets([]);
      setWallets([]);
      setNotifications([]);
      setSubscriptions([]);
      setLoading({ transactions: false, budgets: false, wallets: false, notifications: false, subscriptions: false });
      return;
    }

    setError({ transactions: null, budgets: null, wallets: null, notifications: null, subscriptions: null });

    // Run subscription auto-deduction in the background.
    // A 1-hour cooldown prevents duplicate deductions if the app is opened multiple times
    // in quick succession (e.g. background → foreground).
    const SUBSCRIPTION_COOLDOWN_KEY = `@sub_check_${user.uid}`;
    const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
    (async () => {
      try {
        const lastChecked = await AsyncStorage.getItem(SUBSCRIPTION_COOLDOWN_KEY);
        const now = Date.now();
        if (!lastChecked || now - parseInt(lastChecked, 10) > COOLDOWN_MS) {
          await AsyncStorage.setItem(SUBSCRIPTION_COOLDOWN_KEY, String(now));
          await checkAndProcessSubscriptions(user.uid as string);
        }
      } catch (e) {
        console.error("Subscription check failed:", e);
      }
    })();

    // Preload all cached data. Only set loading state to true for entities that are NOT cached,
    // to prevent UI flicker when data is already available locally.
    const loadCacheAndSetLoading = async () => {
      let loadingState = { transactions: true, budgets: true, wallets: true, notifications: true, subscriptions: true };
      try {
        const cachedTx = await AsyncStorage.getItem(`@cache_tx_${user.uid}`);
        if (cachedTx) { setTransactions(JSON.parse(cachedTx)); loadingState.transactions = false; }

        const cachedBudgets = await AsyncStorage.getItem(`@cache_budgets_${user.uid}`);
        if (cachedBudgets) { setBudgets(JSON.parse(cachedBudgets)); loadingState.budgets = false; }

        const cachedWallets = await AsyncStorage.getItem(`@cache_wallets_${user.uid}`);
        if (cachedWallets) { setWallets(JSON.parse(cachedWallets)); loadingState.wallets = false; }

        const cachedNotifs = await AsyncStorage.getItem(`@cache_notifs_${user.uid}`);
        if (cachedNotifs) { setNotifications(JSON.parse(cachedNotifs)); loadingState.notifications = false; }

        const cachedSubs = await AsyncStorage.getItem(`@cache_subs_${user.uid}`);
        if (cachedSubs) { setSubscriptions(JSON.parse(cachedSubs)); loadingState.subscriptions = false; }
        
        setLoading(loadingState);
      } catch (e) {
        console.error("Failed to load local cache", e);
        setLoading(loadingState);
      }
    };
    loadCacheAndSetLoading();


    // Transactions listener
    const txQuery = query(
      collection(firestore, "transactions"),
      where("uid", "==", user.uid)
    );
    const unsubTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TransactionType[];
        setTransactions(data);
        setLoading((prev) => ({ ...prev, transactions: false }));
        AsyncStorage.setItem(`@cache_tx_${user.uid}`, JSON.stringify(data));
      },
      (err) => {
        console.error("DataContext Transactions error:", err);
        setError((prev) => ({ ...prev, transactions: err.message }));
        setLoading((prev) => ({ ...prev, transactions: false }));
      }
    );

    // Budgets listener
    const budgetQuery = query(
      collection(firestore, "budgets"),
      where("uid", "==", user.uid)
    );
    const unsubBudget = onSnapshot(
      budgetQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as BudgetType[];
        setBudgets(data);
        setLoading((prev) => ({ ...prev, budgets: false }));
        AsyncStorage.setItem(`@cache_budgets_${user.uid}`, JSON.stringify(data));
      },
      (err) => {
        console.error("DataContext Budgets error:", err);
        setError((prev) => ({ ...prev, budgets: err.message }));
        setLoading((prev) => ({ ...prev, budgets: false }));
      }
    );

    // Wallets listener
    const walletQuery = query(
      collection(firestore, "wallets"),
      where("uid", "==", user.uid)
    );
    const unsubWallet = onSnapshot(
      walletQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WalletType[];
        setWallets(data);
        setLoading((prev) => ({ ...prev, wallets: false }));
        AsyncStorage.setItem(`@cache_wallets_${user.uid}`, JSON.stringify(data));
      },
      (err) => {
        console.error("DataContext Wallets error:", err);
        setError((prev) => ({ ...prev, wallets: err.message }));
        setLoading((prev) => ({ ...prev, wallets: false }));
      }
    );

    // Notifications listener
    const notificationQuery = query(
      collection(firestore, "notifications"),
      where("uid", "==", user.uid)
    );
    const unsubNotification = onSnapshot(
      notificationQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NotificationType[];
        
        // Sort by createdAt descending (newest first)
        data.sort((a, b) => {
            const dateA = resolveTime(a.createdAt);
            const dateB = resolveTime(b.createdAt);
            return dateB - dateA;
        });

        setNotifications(data);
        setLoading((prev) => ({ ...prev, notifications: false }));
        AsyncStorage.setItem(`@cache_notifs_${user.uid}`, JSON.stringify(data));
      },
      (err) => {
        console.error("DataContext Notifications error:", err);
        setError((prev) => ({ ...prev, notifications: err.message }));
        setLoading((prev) => ({ ...prev, notifications: false }));
      }
    );

    // Subscriptions listener
    const subscriptionQuery = query(
      collection(firestore, "subscriptions"),
      where("uid", "==", user.uid)
    );
    const unsubSubscription = onSnapshot(
      subscriptionQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SubscriptionType[];
        setSubscriptions(data);
        setLoading((prev) => ({ ...prev, subscriptions: false }));
        AsyncStorage.setItem(`@cache_subs_${user.uid}`, JSON.stringify(data));
      },
      (err) => {
        console.error("DataContext Subscriptions error:", err);
        setError((prev) => ({ ...prev, subscriptions: err.message }));
        setLoading((prev) => ({ ...prev, subscriptions: false }));
      }
    );

    return () => {
      unsubTx();
      unsubBudget();
      unsubWallet();
      unsubNotification();
      unsubSubscription();
    };
  }, [user?.uid]);

  return (
    <DataContext.Provider value={{ transactions, budgets, wallets, notifications, subscriptions, loading, error }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
