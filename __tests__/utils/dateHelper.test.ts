import { resolveDate, resolveTime } from "../../utils/dateHelper";

describe("resolveDate", () => {
  it("handles a Firebase Timestamp object with toDate()", () => {
    const target = new Date("2024-01-15T10:00:00.000Z");
    const fakeTimestamp = { toDate: () => target };
    expect(resolveDate(fakeTimestamp).toISOString()).toBe(target.toISOString());
  });

  it("handles cached AsyncStorage Timestamp { seconds, nanoseconds }", () => {
    const cachedTimestamp = { seconds: 1705276800, nanoseconds: 0 };
    const result = resolveDate(cachedTimestamp);
    expect(result.getFullYear()).toBe(2024);
  });

  it("handles ISO string dates", () => {
    const iso = "2024-06-15T10:00:00.000Z";
    expect(resolveDate(iso).toISOString()).toBe(iso);
  });

  it("handles a plain JavaScript Date object", () => {
    const d = new Date("2024-03-10T12:00:00.000Z");
    expect(resolveDate(d).toISOString()).toBe(d.toISOString());
  });

  it("handles null gracefully and returns a valid Date", () => {
    expect(() => resolveDate(null)).not.toThrow();
    expect(resolveDate(null)).toBeInstanceOf(Date);
  });

  it("handles undefined gracefully and returns a valid Date", () => {
    expect(() => resolveDate(undefined)).not.toThrow();
    expect(resolveDate(undefined)).toBeInstanceOf(Date);
  });

  it("handles zero seconds (epoch) from cached timestamp", () => {
    const result = resolveDate({ seconds: 0, nanoseconds: 0 });
    expect(result.getTime()).toBe(0);
  });
});

describe("resolveTime", () => {
  it("returns a number representing milliseconds", () => {
    const result = resolveTime({ seconds: 1705276800, nanoseconds: 0 });
    expect(typeof result).toBe("number");
    expect(result).toBe(1705276800 * 1000);
  });

  it("returns a number (not NaN) for null input", () => {
    const result = resolveTime(null);
    expect(Number.isNaN(result)).toBe(false);
  });
});
