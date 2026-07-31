import { CreateOrUpdateWallet, deleteWallet, deleteTransactionByWalletId } from "../../services/walletService";
import { doc, setDoc, deleteDoc, getDocs, collection, query, where, limit } from "firebase/firestore";

jest.mock("@/config/firebase", () => ({ firestore: {} }));
jest.mock("../../services/imageService", () => ({
  uploadFileToCloudinary: jest.fn().mockResolvedValue({ success: true, data: "https://cdn.url/img.jpg" }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  // doc() must return an object with an id for tests that check result.data.id
  (doc as jest.Mock).mockReturnValue({ id: "mockId" });
  (collection as jest.Mock).mockReturnValue({});
  (query as jest.Mock).mockReturnValue({});
  (where as jest.Mock).mockReturnValue({});
  (limit as jest.Mock).mockReturnValue({});
});

describe("CreateOrUpdateWallet", () => {
  it("creates a new wallet initialised with zero balances", async () => {
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const result = await CreateOrUpdateWallet({ name: "Cash", uid: "u1", image: null });
    expect(result.success).toBe(true);
    expect(result.data.amount).toBe(0);
    expect(result.data.totalIncome).toBe(0);
    expect(result.data.totalExpense).toBe(0);
  });

  it("uploads image and replaces local uri with CDN url", async () => {
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const result = await CreateOrUpdateWallet({
      name: "Bank", uid: "u1", image: { uri: "file:///local/img.jpg" },
    });
    expect(result.success).toBe(true);
    expect(result.data.image).toBe("https://cdn.url/img.jpg");
  });

  it("returns success: false when Firestore write fails", async () => {
    (setDoc as jest.Mock).mockRejectedValue(new Error("Network error"));
    const result = await CreateOrUpdateWallet({ name: "Savings", uid: "u1", image: null });
    expect(result.success).toBe(false);
    expect(result.msg).toBe("Network error");
  });
});

describe("deleteTransactionByWalletId", () => {
  it("returns success: true when there are no transactions", async () => {
    (getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [], forEach: jest.fn(), empty: true });
    const result = await deleteTransactionByWalletId("wallet1");
    expect(result.success).toBe(true);
  });

  it("processes transactions in pages and stops when page is smaller than limit", async () => {
    const makeDocs = (n: number) => ({
      size: n,
      empty: n === 0,
      docs: Array.from({ length: n }, (_, i) => ({ ref: `ref${i}` })),
      forEach: function(cb: any) { this.docs.forEach(cb); },
    });
    (getDocs as jest.Mock)
      .mockResolvedValueOnce(makeDocs(450))
      .mockResolvedValueOnce(makeDocs(2));

    const result = await deleteTransactionByWalletId("wallet1");
    expect(result.success).toBe(true);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  it("returns success: false on Firestore error", async () => {
    (getDocs as jest.Mock).mockRejectedValue(new Error("Permission denied"));
    const result = await deleteTransactionByWalletId("wallet1");
    expect(result.success).toBe(false);
    expect(result.msg).toBe("Permission denied");
  });
});

describe("deleteWallet � C3 fix: must await transaction deletion", () => {
  it("awaits transaction deletion before returning success", async () => {
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    (getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [], forEach: jest.fn(), empty: true });

    const result = await deleteWallet("w1");
    expect(getDocs).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("still returns success: true even when transaction deletion fails (wallet already deleted)", async () => {
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    (getDocs as jest.Mock).mockRejectedValue(new Error("Offline"));

    const result = await deleteWallet("w1");
    expect(result.success).toBe(true);
  });
});
