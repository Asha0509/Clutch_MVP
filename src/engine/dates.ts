// UTC calendar-day maths. `today` is always passed in (Sec 8); nothing here reads the clock.
const DAY_MS = 86_400_000;

export const parseIso = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const dayNumber = (d: Date): number =>
  Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS,
  );

export const daysBetween = (from: Date, to: Date): number =>
  dayNumber(to) - dayNumber(from);

export const daysInMonth = (year: number, month0: number): number =>
  new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

// A date in the given month, clamping the day (31 Feb becomes 28 or 29 Feb). month0 may overflow by a year.
export const dateIn = (year: number, month0: number, day: number): Date => {
  const first = new Date(Date.UTC(year, month0, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth();
  return new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m))));
};

// Start (inclusive) and end (exclusive) of a period containing `today`.
export type Bounds = { start: Date; end: Date };

// Card year: from the anniversary on or before today to the next one (the renewal date).
export function cardYear(
  anniversaryMonth: number,
  openedOn: string | undefined,
  today: Date,
): Bounds {
  const day = openedOn ? parseIso(openedOn).getUTCDate() : 1;
  const thisYear = dateIn(today.getUTCFullYear(), anniversaryMonth - 1, day);
  const startYear =
    thisYear.getTime() > today.getTime()
      ? today.getUTCFullYear() - 1
      : today.getUTCFullYear();
  return {
    start: dateIn(startYear, anniversaryMonth - 1, day),
    end: dateIn(startYear + 1, anniversaryMonth - 1, day),
  };
}

export function calendarPeriod(
  period: "month" | "quarter" | "year",
  today: Date,
): Bounds {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  if (period === "month")
    return { start: dateIn(y, m, 1), end: dateIn(y, m + 1, 1) };
  if (period === "quarter") {
    const q = m - (m % 3);
    return { start: dateIn(y, q, 1), end: dateIn(y, q + 3, 1) };
  }
  return { start: dateIn(y, 0, 1), end: dateIn(y + 1, 0, 1) };
}
