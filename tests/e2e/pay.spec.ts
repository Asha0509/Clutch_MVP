import { expect, test, type Page } from "@playwright/test";
import { addCards, onboardAdult, shoot } from "./helpers";

// PRD F8, Sec 4 journey 3, Sec 13 step 5: fixture cases give the expected winner and caveats.
// Held: Tata Neu Infinity (RuPay, fee Rs 1,499), Millennia (Visa, Rs 1,000), SBI Cashback (Visa, Rs 999).

async function ask(
  page: Page,
  what: string,
  amount: string,
  how: "Card" | "UPI",
  shop = "",
) {
  await page
    .getByLabel("What are you paying for")
    .selectOption({ label: what });
  await page.getByLabel("Amount in Rs").fill(amount);
  await page.getByLabel("How you pay").selectOption({ label: how });
  await page.getByLabel("Shop or app (optional)").fill(shop);
}

test("pay with: UPI, merchant tie-break and an excluded category", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await onboardAdult(page, `pay-${Date.now()}@example.com`);
  await addCards(page, [
    "Tata Neu Infinity HDFC Bank Credit Card",
    "HDFC Millennia Credit Card",
    "CASHBACK SBI Card",
  ]);
  await page.getByRole("link", { name: "Which card to pay with" }).click();
  await expect(
    page.getByRole("heading", { name: "Which card to pay with" }),
  ).toBeVisible();

  const top = page.getByTestId("top-card");
  const runnerUp = page.getByTestId("runner-up");
  const cannot = page.getByTestId("cannot-use");

  // A. UPI groceries Rs 2,000: only the RuPay card can take UPI. Tata Neu UPI 0.5% = Rs 10.
  await ask(page, "Groceries", "2000", "UPI");
  await expect(top).toContainText("Tata Neu Infinity HDFC Bank Credit Card");
  await expect(top).toContainText("Rs 10 back");
  await expect(top).toContainText("UPI works on this card");
  await expect(top).toContainText(/small UPI payments/);
  await expect(cannot).toContainText("HDFC Millennia Credit Card");
  await expect(cannot).toContainText("CASHBACK SBI Card");
  await expect(cannot).toContainText(
    "This card cannot be used for UPI payments.",
  );
  await shoot(page, "pay-upi");

  // B. Card, online shopping Rs 4,000 at Amazon: Millennia 5% = Rs 200, SBI 5% online = Rs 200. Tie: SBI's
  // Rs 999 fee is lower than Millennia's Rs 1,000, so SBI wins and Millennia is runner-up.
  await ask(page, "Online shopping", "4000", "Card", "Amazon");
  await expect(top).toContainText("CASHBACK SBI Card");
  await expect(top).toContainText("Rs 200 back");
  await expect(top).toContainText(
    "Same reward as HDFC Millennia Credit Card; this card has the lower annual fee.",
  );
  await expect(runnerUp).toContainText("HDFC Millennia Credit Card");
  await expect(runnerUp).toContainText("Rs 200 back");
  await expect(runnerUp).toContainText(
    "Assumes none of the Rs 1,000 monthly cap is used yet.",
  );
  await expect(top).toContainText(
    "Card facts checked against the bank's documents on",
  );
  await shoot(page, "pay-card");

  // C. Rent Rs 20,000: all three cards exclude rent, so nothing earns and no card is called best.
  await ask(page, "Rent", "20000", "Card");
  await expect(
    page.getByText("None of your cards earn rewards on this."),
  ).toBeVisible();
  await expect(top).toHaveCount(0);
  await shoot(page, "pay-none");

  // D. Milestone bonus is shown but never ranks a card higher (Sec 8.3 rule 4). Millennia has Rs 95,000 spent this
  // quarter; Rs 10,000 more crosses its Rs 1,00,000 milestone. Dining Rs 10,000 earns Tata Neu 1.5% = Rs 150,
  // SBI 1% = Rs 100, Millennia 1% = Rs 100 (tie with SBI, SBI's fee is lower), so Millennia stays third.
  await page.goto("/cards");
  await page
    .getByRole("list", { name: "Cards you hold" })
    .getByRole("listitem")
    .filter({ hasText: "Millennia" })
    .getByRole("button", { name: "Add details" })
    .click();
  await page.getByLabel("Spend this calendar quarter, in Rs").fill("95000");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("link", { name: "Which card to pay with" }).click();
  await ask(page, "Dining and food delivery", "10000", "Card");
  await expect(top).toContainText("Tata Neu Infinity HDFC Bank Credit Card");
  await expect(top).toContainText("Rs 150 back");
  await expect(top).toContainText("UPI works on this card.");
  await expect(runnerUp).toContainText("CASHBACK SBI Card");
  const millennia = page
    .getByTestId("other-card")
    .filter({ hasText: "HDFC Millennia Credit Card" });
  await expect(millennia).toContainText("Rs 100 back");
  await expect(millennia).toContainText(
    "This payment would complete a milestone: Gift voucher worth Rs 1,000",
  );
  await shoot(page, "pay-milestone");
});
