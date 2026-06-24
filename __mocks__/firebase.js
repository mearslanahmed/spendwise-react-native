export class FirebaseError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const getFirestore = jest.fn();
export const collection = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const orderBy = jest.fn();
export const getAggregateFromServer = jest.fn();
export const sum = jest.fn();
export const limit = jest.fn();
export const Timestamp = {
  fromDate: jest.fn(),
  now: jest.fn()
};
