import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { TransactionType, BudgetType, WalletType, NotificationType } from "@/types";

interface DataContextType {
  transactions: TransactionType[];
  budgets: BudgetType[];
  wallets: WalletType[];
  notifications: NotificationType[];
  loading: {
    transactions: boolean;
    budgets: boolean;
    wallets: boolean;
    notifications: boolean;
  };
  error: {
    transactions: string | null;
    budgets: string | null;
    wallets: string | null;
    notifications: string | null;
  };
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  const [loading, setLoading] = useState({
    transactions: true,
    budgets: true,
    wallets: true,
    notifications: true,
  });

  const [error, setError] = useState<{
    transactions: string | null;
    budgets: string | null;
    wallets: string | null;
    notifications: string | null;
  }>({
    transactions: null,
    budgets: null,
    wallets: null,
    notifications: null,
  });

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setBudgets([]);
      setWallets([]);
      setNotifications([]);
      setLoading({ transactions: false, budgets: false, wallets: false, notifications: false });
      return;
    }

    setLoading({ transactions: true, budgets: true, wallets: true, notifications: true });
    setError({ transactions: null, budgets: null, wallets: null, notifications: null });

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
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return dateB - dateA;
        });

        setNotifications(data);
        setLoading((prev) => ({ ...prev, notifications: false }));
      },
      (err) => {
        console.error("DataContext Notifications error:", err);
        setError((prev) => ({ ...prev, notifications: err.message }));
        setLoading((prev) => ({ ...prev, notifications: false }));
      }
    );

    return () => {
      unsubTx();
      unsubBudget();
      unsubWallet();
      unsubNotification();
    };
  }, [user?.uid]);

  return (
    <DataContext.Provider value={{ transactions, budgets, wallets, notifications, loading, error }}>
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
