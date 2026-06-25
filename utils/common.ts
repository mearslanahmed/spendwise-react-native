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