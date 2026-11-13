import { describe, expect, it } from "vitest";
import { formatRs } from "@/engine/format";

describe("formatRs", () => {
  // 1,00,000 in Indian grouping
  it("groups in lakhs", () => {
    expect(formatRs(100000)).toBe("Rs 1,00,000");
  });
  it("rounds to whole rupees", () => {
    expect(formatRs(8000.4)).toBe("Rs 8,000");
  });
});
