import { expect, test } from "@playwright/test";
import {
  addCards,
  callAs,
  listDocs,
  makeAdmin,
  onboardAdult,
  seedDoc,
  seedTyped,
  shoot,
  signIn,
  storeSession,
} from "./helpers";

// PRD Sec 10 and Sec 13 step 6: a fake change on a fixture card reaches a fixture user's email via the
// emulator, and unapproved alerts never send.
test("approved alerts reach holders who chose email; pending and rejected ones never send", async ({
  browser,
  page,
  baseURL,
}) => {
  const run = Date.now();
  const feeAlert = `e2e-millennia-fee-${run}`;
  const otherAlert = `e2e-millennia-lounge-${run}`;
  const issuerUrl =
    "https://www.hdfc.bank.in/credit-cards/millennia-credit-card";

  // U chose email alerts; V did not. Both hold Millennia.
  const uPage = await (await browser.newContext({ baseURL })).newPage();
  const uEmail = `alerts-u-${run}@example.com`;
  await onboardAdult(uPage, uEmail, { emailAlerts: true });
  await addCards(uPage, ["HDFC Millennia Credit Card"]);
  const vPage = await (await browser.newContext({ baseURL })).newPage();
  const vUid = await onboardAdult(vPage, `alerts-v-${run}@example.com`);
  await addCards(vPage, ["HDFC Millennia Credit Card"]);

  // W chose email alerts, then withdrew: the latest consent entry is a no, so W gets no email (Sec 11.2).
  const wPage = await (await browser.newContext({ baseURL })).newPage();
  const wUid = await onboardAdult(wPage, `alerts-w-${run}@example.com`, {
    emailAlerts: true,
  });
  await addCards(wPage, ["HDFC Millennia Credit Card"]);
  await seedTyped(page, `consents/${wUid}/log/withdrawn-${run}`, {
    purpose: { stringValue: "alerts_email" },
    granted: { booleanValue: false },
    noticeVersion: { stringValue: "2026-11-14" },
    at: { timestampValue: new Date().toISOString() },
    userAgentHash: { stringValue: "e2e" },
  });

  // Two pending alerts, as ingestChangeFeed writes them.
  for (const [id, title] of [
    [feeAlert, "Annual fee raised"],
    [otherAlert, "Lounge access changed"],
  ])
    await seedDoc(page, `alerts/${id}`, {
      cardId: "hdfc-millennia",
      title,
      before: "Rs 1,000 a year",
      after: "Rs 1,500 a year",
      changeType: "fee",
      feedDate: "2026-11-14",
      feedTier: "official",
      feedUrl: issuerUrl,
      status: "pending",
    });
  const outboxFor = async (alertId: string) =>
    (await listDocs(page, "outbox")).filter((d) => d.alertId === alertId);
  expect(await outboxFor(feeAlert)).toHaveLength(0);

  // A non-admin calling approveAlert directly is refused by the server (Sec 6.2).
  const denied = await callAs(
    page,
    `alerts-v-${run}@example.com`,
    "approveAlert",
    { alertId: feeAlert, decision: "reject" },
  );
  expect(denied.body.error?.status).toBe("PERMISSION_DENIED");

  // The Founder: admin claim, then a fresh sign-in so the token carries it.
  const adminEmail = `founder-${run}@example.com`;
  await makeAdmin(page, await signIn(page, adminEmail));
  await storeSession(page, adminEmail);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/admin");
  const fee = page.getByTestId(`alert-${feeAlert}`);
  await expect(fee).toContainText("Annual fee raised");
  await shoot(page, "admin");

  // Approve the fee rise from Rs 1,000 to Rs 1,500. Neither user entered spend, so the waiver is not met
  // and the engine prices it at -Rs 500 a year.
  await fee.getByLabel("Bank's notice link").fill(issuerUrl);
  await fee.getByLabel("Change to price").selectOption("fee");
  await fee.getByLabel("Annual fee before, in Rs").fill("1000");
  // A blank value cannot be sent as Rs 0: Approve stays off until both values are filled.
  await fee
    .getByRole("checkbox", { name: /I opened the bank's notice/ })
    .check();
  await expect(
    fee.getByRole("button", { name: "Approve and send" }),
  ).toBeDisabled();
  await fee.getByLabel("Annual fee after, in Rs").fill("1500");
  await fee.getByRole("button", { name: "Approve and send" }).click();
  await expect(
    page.getByText("Approved. 3 holders told, 1 email sent."),
  ).toBeVisible();

  // Reject the other one: nothing goes out.
  await page
    .getByTestId(`alert-${otherAlert}`)
    .getByRole("button", { name: "Reject" })
    .click();
  await expect(page.getByText("Rejected. Nothing was sent.")).toBeVisible();

  const sent = await outboxFor(feeAlert);
  expect(sent).toHaveLength(1);
  expect(sent[0].to).toBe(uEmail);
  expect(String(sent[0].text)).toContain("costs you about Rs 500 a year");
  expect(String(sent[0].text)).toContain(issuerUrl);
  expect(await outboxFor(otherAlert)).toHaveLength(0);

  // "Send to anyone missed" finds nobody left and emails nobody twice.
  await page
    .getByRole("button", { name: "Send to anyone missed" })
    .first()
    .click();
  await expect(
    page.getByText("Finished. 0 more told, 0 more emailed."),
  ).toBeVisible();
  expect(await outboxFor(feeAlert)).toHaveLength(1);

  // V gets the in-app alert but no email.
  const vAlerts = await listDocs(page, `users/${vUid}/alerts`);
  expect(vAlerts.map((a) => a.id)).toContain(feeAlert);

  // U sees it on the checkup.
  await uPage.goto("/checkup");
  await expect(
    uPage.getByRole("heading", { name: "Changes to your cards" }),
  ).toBeVisible();
  await expect(uPage.getByText("Annual fee raised")).toBeVisible();
  await expect(uPage.getByText("costs you about Rs 500 a year")).toBeVisible();
  await shoot(uPage, "checkup-alerts");
});
