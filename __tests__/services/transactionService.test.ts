import { deleteTransaction } from '../../services/transactionService';

jest.mock('@/config/firebase', () => ({
  firestore: {},
}));

describe('Transaction Service Tests', () => {
  it('should have deleteTransaction defined', () => {
    expect(deleteTransaction).toBeDefined();
  });
});

