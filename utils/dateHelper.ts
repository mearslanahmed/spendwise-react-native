import { Timestamp } from "firebase/firestore";

/**
 * Safely resolves a Date object from a mixed type that could be:
 * 1. A valid Firebase Timestamp object (with .toDate() method)
 * 2. A stringified JSON representation of a Timestamp (from AsyncStorage)
 * 3. An ISO Date string
 * 4. A standard JavaScript Date object
 */
export const resolveDate = (dateObj: any): Date => {
  if (!dateObj) return new Date();

  // 1. Firebase Timestamp
  if (typeof dateObj.toDate === "function") {
    return dateObj.toDate();
  }

  // 2. Parsed JSON from AsyncStorage { seconds, nanoseconds }
  if (dateObj.seconds !== undefined) {
    return new Date(dateObj.seconds * 1000);
  }

  // 3 & 4. ISO String or Date Object
  return new Date(dateObj);
};

/**
 * Safely resolves a timestamp (number) from a mixed type
 */
export const resolveTime = (dateObj: any): number => {
  return resolveDate(dateObj).getTime();
};
