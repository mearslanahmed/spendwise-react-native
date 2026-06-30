import { ResponseType, BudgetType } from "@/types";
import { collection, deleteDoc, doc, getAggregateFromServer, getDocs, query, setDoc, sum, Timestamp, where } from "firebase/firestore";
import { firestore } from "@/config/firebase";

/**
 * Creates a new category budget limit or updates an existing one.
 */
export const createOrUpdateBudget = async (
  budgetData: Partial<BudgetType>
): Promise<ResponseType> => {
  try {
    const budgetToSave = { ...budgetData };

    if (!budgetData.id) {
      budgetToSave.created = new Date();
    }

    const budgetRef = budgetData.id
      ? doc(firestore, "budgets", budgetData.id)
      : doc(collection(firestore, "budgets"));

    await setDoc(budgetRef, budgetToSave, { merge: true });

    return { success: true, data: { ...budgetToSave, id: budgetRef.id } };
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : "Failed to create/update budget";
    return { success: false, msg };
  }
};

/**
 * Deletes a category budget limit.
 */
export const deleteBudget = async (budgetId: string): Promise<ResponseType> => {
  try {
    const budgetRef = doc(firestore, "budgets", budgetId);
    await deleteDoc(budgetRef);
    return { success: true, msg: "Budget deleted successfully" };
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : "Failed to delete budget";
    return { success: false, msg };
  }
};

/**
 * Fetches all active budgets for a user.
 */
export const fetchUserBudgets = async (uid: string): Promise<BudgetType[]> => {
  try {
    const q = query(collection(firestore, "budgets"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    const budgets: BudgetType[] = [];
    querySnapshot.forEach((doc) => {
      budgets.push({ id: doc.id, ...doc.data() } as BudgetType);
    });
    return budgets;
  } catch (error) {
    console.error("Error fetching user budgets:", error);
    return [];
  }
};

/**
 * Calculates the total sum of expense transactions in the current calendar month for a given category.
 * Uses high-performance server-side aggregation.
 */
export const fetchCategorySpentThisMonth = async (
  uid: string,
  category: string
): Promise<number> => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
    const startTimestamp = Timestamp.fromDate(startOfMonth);

    const transactionQuery = query(
      collection(firestore, "transactions"),
      where("uid", "==", uid),
      where("type", "==", "expense"),
      where("category", "==", category),
      where("date", ">=", startTimestamp)
    );

    const snapshot = await getAggregateFromServer(transactionQuery, {
      totalSpent: sum("amount")
    });

    return snapshot.data().totalSpent || 0;
  } catch (error) {
    console.error("Error fetching category spent amount this month:", error);
    return 0;
  }
};
