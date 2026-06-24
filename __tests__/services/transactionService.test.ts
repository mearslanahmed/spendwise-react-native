import { fetchWeeklyStats } from '../../services/transactionService';

jest.mock('@/config/firebase', () => ({
  firestore: {},
}));

describe('Transaction Service Tests', () => {
  it('should have fetchWeeklyStats defined', () => {
    expect(fetchWeeklyStats).toBeDefined();
  });

});
