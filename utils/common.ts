const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLast7Days = () => {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    result.push({
      day: daysOfWeek[date.getDay()],
      date: formatLocalDate(date), 
      income: 0,
      expense: 0,
    });
  }

  return result;
  // returns an array of all the previous 7 days in chronological order
};

export const getLast12Months = () => {
  const monthsOfYear = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  const result = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setDate(1); // Prevent month overflow
    date.setMonth(date.getMonth() - i);
    const monthName = monthsOfYear[date.getMonth()];
    const shortYear = date.getFullYear().toString().slice(-2);
    const formattedMonthYear = `${monthName} ${shortYear}`; // Jan 24, Feb 25
    const formattedDate = formatLocalDate(date);

    result.push({
      month: formattedMonthYear,
      fullDate: formattedDate,
      income: 0,
      expense: 0,
    });
  }

  return result;
};


export const getYearsRange = (startYear: number, endYear: number): any => {
  const result = [];
  for (let year = startYear; year <= endYear; year++) {
    result.push({
      year: year.toString(),
      fullDate: `01-01-${year}`,
      income: 0,
      expense: 0,
    });
  }

  return result;
};

/**
 * Sanitizes technical, backend, or Firestore errors into user-friendly messages.
 * Prevents internal details, stack traces, and document paths from leaking into UI toasts.
 */
export const sanitizeErrorMessage = (
  error: unknown,
  fallbackMessage: string = "An unexpected error occurred. Please try again."
): string => {
  if (!error) return fallbackMessage;

  const rawMsg =
    typeof error === "string"
      ? error
      : (error as any)?.message || (error as any)?.msg || String(error);

  const lower = rawMsg.toLowerCase();

  // Network / connectivity issues
  if (
    lower.includes("network") ||
    lower.includes("offline") ||
    lower.includes("unavailable") ||
    lower.includes("failed to fetch") ||
    lower.includes("timeout") ||
    lower.includes("deadline-exceeded")
  ) {
    return "Network connection issue. Please check your internet and try again.";
  }

  // Permission / authentication issues
  if (
    lower.includes("permission-denied") ||
    lower.includes("permission_denied") ||
    lower.includes("unauthenticated") ||
    lower.includes("not authenticated") ||
    lower.includes("insufficient permissions")
  ) {
    return "You do not have permission to perform this action. Please check your account.";
  }

  // Not found
  if (lower.includes("not-found") || lower.includes("not found")) {
    return "The requested record could not be found.";
  }

  // Quota / rate limits
  if (lower.includes("resource-exhausted") || lower.includes("quota")) {
    return "Service is temporarily busy. Please wait a moment and try again.";
  }

  // Image upload issues
  if (
    lower.includes("cloudinary") ||
    lower.includes("upload failed") ||
    lower.includes("receipt image")
  ) {
    return "Failed to upload receipt image. Please check your connection or choose another image.";
  }

  // Technical backend / Firestore leak detection
  const isTechnical =
    rawMsg.includes("FirebaseError") ||
    rawMsg.includes("Firestore") ||
    rawMsg.includes("WriteBatch") ||
    rawMsg.includes("Unsupported field") ||
    rawMsg.includes("invalid-argument") ||
    rawMsg.includes("debts/") ||
    rawMsg.includes("wallets/") ||
    rawMsg.includes("transactions/") ||
    rawMsg.includes("at ") ||
    rawMsg.includes("undefined (found in") ||
    rawMsg.includes("Cannot read property") ||
    rawMsg.includes("null is not an object");

  if (isTechnical) {
    return fallbackMessage;
  }

  // If it's a short, intentional validation message (e.g. "Please enter a valid amount"), keep it
  if (rawMsg.trim().length > 0 && rawMsg.length < 140) {
    return rawMsg.trim();
  }

  return fallbackMessage;
};
