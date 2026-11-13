// Money is integer rupees. Format only at the edge.
export function formatRs(rupees: number): string {
  return "Rs " + Math.round(rupees).toLocaleString("en-IN");
}
