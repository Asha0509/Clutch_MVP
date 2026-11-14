import { formatRs } from "@/engine/format";

// One sentence for an approved change, used in the email and on the checkup. The figure comes from
// impactOfChange in src/engine; this only words it (PRD Sec 2.3).
export function impactLine(rupeesPerYear: number | null): string {
  if (rupeesPerYear === null)
    return "We could not put a rupee figure on this change.";
  if (rupeesPerYear < 0)
    return `On what you have told us, this costs you about ${formatRs(-rupeesPerYear)} a year.`;
  if (rupeesPerYear > 0)
    return `On what you have told us, this is worth about ${formatRs(rupeesPerYear)} more a year to you.`;
  return "On what you have told us, this does not change what the card costs you.";
}
