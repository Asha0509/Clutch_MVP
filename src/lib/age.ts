// PRD Sec 6.1, Founder decision: birth year and month. The month of the 18th birthday counts as under 18.
// Same rule as isAdult() in firestore.rules, which is what actually enforces it.
export function isAdult(
  dobYear: number,
  dobMonth: number,
  today: Date,
): boolean {
  const age = today.getUTCFullYear() - dobYear;
  return age > 18 || (age === 18 && dobMonth < today.getUTCMonth() + 1);
}

// Today's local calendar date as a UTC midnight, the form the engine expects (src/engine/dates.ts).
export function todayUtc(now: Date): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
