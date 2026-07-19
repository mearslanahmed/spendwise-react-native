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

/**
 * Formats a date safely without relying on Hermes Intl polyfills
 * Returns format like "Oct 24, 2024" or "Oct 24"
 */
export const formatDateShort = (dateObj: any, includeYear: boolean = true): string => {
  const d = resolveDate(dateObj);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  if (includeYear) {
    return `${month} ${day}, ${year}`;
  }
  return `${month} ${day}`;
};
