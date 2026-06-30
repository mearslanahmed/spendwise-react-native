/* global jest */
export class FirebaseError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const getFirestore = jest.fn();
export const collection = jest.fn();
export const doc = jest.fn();
export const setDoc = jest.fn();
export const deleteDoc = jest.fn();
export const getDocs = jest.fn();
export const updateDoc = jest.fn();
export const addDoc = jest.fn();
export const getDoc = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const orderBy = jest.fn();
export const getAggregateFromServer = jest.fn();
export const sum = jest.fn();
export const limit = jest.fn();
export const runTransaction = jest.fn(async (db, updateFunction) => {
  const transaction = {
    get: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({}) }),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return updateFunction(transaction);
});
export const writeBatch = jest.fn(() => ({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
}));
export const Timestamp = {
  fromDate: jest.fn((date) => ({
    toDate: () => date,
    seconds: date.getTime() / 1000,
    nanoseconds: 0
  })),
  now: jest.fn()
};
