import { calculateNextBillingDate, checkAndProcessSubscriptions } from "@/services/subscriptionService";
import { firestore } from "@/config/firebase";
import { getDoc, getDocs, runTransaction } from "firebase/firestore";

jest.mock("@/config/firebase", () => ({
  firestore: {}
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    fromDate: jest.fn((date) => date),
  },
  runTransaction: jest.fn(),
}));

jest.mock("@/services/expoNotificationService", () => ({
  scheduleLocalNotification: jest.fn(),
}));

describe("Subscription Service Edge Cases", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateNextBillingDate", () => {
    it("should correctly calculate next billing date for weekly frequency", () => {
      const date = new Date("2023-01-01T00:00:00Z");
      const next = calculateNextBillingDate(date, "weekly");
      expect(next.toISOString()).toBe(new Date("2023-01-08T00:00:00Z").toISOString());
    });

    it("should correctly calculate next billing date for monthly frequency across year boundary", () => {
      const date = new Date("2023-12-15T00:00:00Z");
      const next = calculateNextBillingDate(date, "monthly");
      expect(next.toISOString()).toBe(new Date("2024-01-15T00:00:00Z").toISOString());
    });

    it("should correctly handle leap years for yearly frequency", () => {
      const date = new Date("2024-02-29T00:00:00Z"); // Leap year
      const next = calculateNextBillingDate(date, "yearly");
      expect(next.getMonth()).toBe(1); // February (0-indexed)
      expect(next.getDate()).toBe(28); // Rolls back to 28th in non-leap year
      expect(next.getFullYear()).toBe(2025);
    });
  });

  describe("checkAndProcessSubscriptions edge cases", () => {
    it("should return early if user has no auto-deduct subscriptions", async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ pushNotificationsEnabled: false }) });
      (getDocs as jest.Mock).mockResolvedValue({ empty: true });
      
      await checkAndProcessSubscriptions("user-1");
      expect(runTransaction).not.toHaveBeenCalled();
    });

    it("should process multiple missed cycles and update wallet correctly", async () => {
      // Mock user doc
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ pushNotificationsEnabled: true }) });
      
      // Mock subscription snapshot
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: "sub-1" }]
      });

      // Simulate a subscription that missed 3 monthly payments
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2); // 2 months ago (missed this one, last month, and current)

      const mockSubSnap = {
        exists: () => true,
        data: () => ({
          name: "Netflix",
          amount: 15,
          walletId: "wallet-1",
          frequency: "monthly",
          nextBillingDate: twoMonthsAgo,
          autoDeduct: true
        })
      };

      const mockWalletSnap = {
        exists: () => true,
        data: () => ({
          amount: 100, // Enough for 3 * 15 = 45
          totalExpense: 0
        })
      };

      const mockTransaction = {
        get: jest.fn()
          .mockResolvedValueOnce(mockSubSnap) // subRef
          .mockResolvedValueOnce(mockWalletSnap), // walletRef
        set: jest.fn(),
        update: jest.fn()
      };

      (runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return callback(mockTransaction);
      });

      await checkAndProcessSubscriptions("user-1");

      // We should have created 3 transactions + 1 notification
      expect(mockTransaction.set).toHaveBeenCalledTimes(4);
      // We should have updated the wallet and the subscription
      expect(mockTransaction.update).toHaveBeenCalledTimes(2);
      
      // Check the final wallet update values
      expect(mockTransaction.update).toHaveBeenCalledWith(undefined, expect.objectContaining({
        amount: 100 - 45, // 55
        totalExpense: 45
      }));
    });

    it("should stop processing and send notification if insufficient funds", async () => {
      // Mock user doc
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ pushNotificationsEnabled: true }) });
      
      // Mock subscription snapshot
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: "sub-1" }]
      });

      // Missed 1 payment
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockSubSnap = {
        exists: () => true,
        data: () => ({
          name: "Gym",
          amount: 50,
          walletId: "wallet-1",
          frequency: "monthly",
          nextBillingDate: pastDate,
          autoDeduct: true
        })
      };

      const mockWalletSnap = {
        exists: () => true,
        data: () => ({
          amount: 20, // Not enough!
          totalExpense: 0
        })
      };

      const mockTransaction = {
        get: jest.fn()
          .mockResolvedValueOnce(mockSubSnap) // subRef
          .mockResolvedValueOnce(mockWalletSnap), // walletRef
        set: jest.fn(),
        update: jest.fn()
      };

      (runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return callback(mockTransaction);
      });

      await checkAndProcessSubscriptions("user-1");

      // It should create a notification (set called once) and update subscription (lastNotified)
      expect(mockTransaction.set).toHaveBeenCalledTimes(1);
      expect(mockTransaction.update).toHaveBeenCalledTimes(1);

      // Verify notification details
      expect(mockTransaction.set).toHaveBeenCalledWith(undefined, expect.objectContaining({
        title: "Subscription Failed",
      }));
    });
  });
});
