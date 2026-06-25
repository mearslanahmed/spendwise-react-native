import {
  createOrUpdateBudget,
  deleteBudget,
  fetchUserBudgets,
  fetchCategorySpentThisMonth,
} from '../../services/budgetService';
import { doc, collection, setDoc, deleteDoc, getDocs, getAggregateFromServer } from 'firebase/firestore';

jest.mock('@/config/firebase', () => ({
  firestore: {},
}));

describe('Budget Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateBudget', () => {
    it('should successfully create a new budget without an ID', async () => {
      const budgetData = {
        uid: 'user123',
        category: 'groceries',
        amount: 200,
      };

      (doc as jest.Mock).mockReturnValue({ id: 'newBudget123' });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await createOrUpdateBudget(budgetData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('newBudget123');
      expect(result.data.category).toBe('groceries');
      expect(result.data.amount).toBe(200);
      expect(setDoc).toHaveBeenCalled();
    });

    it('should successfully update an existing budget with an ID', async () => {
      const budgetData = {
        id: 'budget456',
        uid: 'user123',
        category: 'rent',
        amount: 1200,
      };

      (doc as jest.Mock).mockReturnValue({ id: 'budget456' });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await createOrUpdateBudget(budgetData);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('budget456');
      expect(result.data.amount).toBe(1200);
      expect(setDoc).toHaveBeenCalled();
    });

    it('should return success false and error message on rejection', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (setDoc as jest.Mock).mockRejectedValue(new Error('Firestore write error'));

      const result = await createOrUpdateBudget({ uid: 'user123' });

      expect(result.success).toBe(false);
      expect(result.msg).toBe('Firestore write error');
    });
  });

  describe('deleteBudget', () => {
    it('should successfully delete a budget', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await deleteBudget('budgetId123');

      expect(result.success).toBe(true);
      expect(result.msg).toBe('Budget deleted successfully');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should return success false on deletion failure', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Delete error'));

      const result = await deleteBudget('budgetId123');

      expect(result.success).toBe(false);
      expect(result.msg).toBe('Delete error');
    });
  });

  describe('fetchUserBudgets', () => {
    it('should fetch user budgets and return them as an array', async () => {
      const mockDocs = [
        { id: 'b1', data: () => ({ uid: 'user123', category: 'groceries', amount: 150 }) },
        { id: 'b2', data: () => ({ uid: 'user123', category: 'rent', amount: 1000 }) },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        forEach: (callback: Function) => mockDocs.forEach((doc) => callback(doc)),
      });

      const budgets = await fetchUserBudgets('user123');

      expect(budgets).toHaveLength(2);
      expect(budgets[0].id).toBe('b1');
      expect(budgets[0].category).toBe('groceries');
      expect(budgets[1].amount).toBe(1000);
    });

    it('should return empty array on failure', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Fetch error'));
      const budgets = await fetchUserBudgets('user123');
      expect(budgets).toEqual([]);
    });
  });

  describe('fetchCategorySpentThisMonth', () => {
    it('should return total spent using aggregate sum mock', async () => {
      (getAggregateFromServer as jest.Mock).mockResolvedValue({
        data: () => ({ totalSpent: 275.5 }),
      });

      const total = await fetchCategorySpentThisMonth('user123', 'groceries');

      expect(total).toBe(275.5);
      expect(getAggregateFromServer).toHaveBeenCalled();
    });

    it('should return 0 if totalSpent is null or missing', async () => {
      (getAggregateFromServer as jest.Mock).mockResolvedValue({
        data: () => ({ totalSpent: null }),
      });

      const total = await fetchCategorySpentThisMonth('user123', 'groceries');

      expect(total).toBe(0);
    });

    it('should return 0 on query failure', async () => {
      (getAggregateFromServer as jest.Mock).mockRejectedValue(new Error('Aggregate error'));
      const total = await fetchCategorySpentThisMonth('user123', 'groceries');
      expect(total).toBe(0);
    });
  });
});
