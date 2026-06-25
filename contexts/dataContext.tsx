import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { TransactionType, BudgetType, WalletType } from "@/types";

interface DataContextType {
  transactions: TransactionType[];
  budgets: BudgetType[];
  wallets: WalletType[];
  loading: {
    transactions: boolean;
    budgets: boolean;
    wallets: boolean;
  };
  error: {
    transactions: string | null;
    budgets: string | null;
    wallets: string | null;
  };
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);

  const [loading, setLoading] = useState({
    transactions: true,
    budgets: true,
    wallets: true,
  });

  const [error, setError] = useState<{
    transactions: string | null;
    budgets: string | null;
    wallets: string | null;
  }>({
    transactions: null,
    budgets: null,
    wallets: null,
  });

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setBudgets([]);
      setWallets([]);
      setLoading({ transactions: false, budgets: false, wallets: false });
      return;
    }

    setLoading({ transactions: true, budgets: true, wallets: true });
    setError({ transactions: null, budgets: null, wallets: null });

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

    return () => {
      unsubTx();
      unsubBudget();
      unsubWallet();
    };
  }, [user?.uid]);

  return (
    <DataContext.Provider value={{ transactions, budgets, wallets, loading, error }}>
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
