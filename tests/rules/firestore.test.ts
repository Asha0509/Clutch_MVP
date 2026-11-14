import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const without = (o: Record<string, unknown>, key: string) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));

// PRD Sec 6.4, Sec 11.2, Sec 13 step 2. Runs inside the emulator via `pnpm test:rules`.
let env: RulesTestEnvironment;

const A = { uid: "alice", email: "alice@example.com" };
const B = { uid: "bob", email: "bob@example.com" };
const as = (
  u: { uid: string; email: string },
  claims: Record<string, unknown> = {},
) => env.authenticatedContext(u.uid, { email: u.email, ...claims }).firestore();

// Age-gate dates are built from the rules' clock (UTC) so the tests do not rot.
const now = new Date();
const thisYear = now.getUTCFullYear();
const thisMonth = now.getUTCMonth() + 1;
const turned18LastMonth =
  thisMonth > 1
    ? { dobYear: thisYear - 18, dobMonth: thisMonth - 1 }
    : { dobYear: thisYear - 19, dobMonth: 12 };

const profile = (
  u: { email: string },
  extra: Record<string, unknown> = {},
) => ({
  createdAt: serverTimestamp(),
  displayName: "Test User",
  email: u.email,
  dobYear: 2000,
  dobMonth: 6,
  locale: "en-IN",
  ...extra,
});
const userCard = (extra: Record<string, unknown> = {}) => ({
  cardId: "hdfc-millennia",
  anniversaryMonth: 3,
  ...extra,
});
const consent = (extra: Record<string, unknown> = {}) => ({
  purpose: "core",
  granted: true,
  noticeVersion: "2026-11-14",
  at: serverTimestamp(),
  userAgentHash: "abc123",
  ...extra,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-clutch",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  // Seed Bob's data with rules off so isolation tests have something to try to read.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/bob"), {
      ...profile(B),
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users/bob/cards/c1"), userCard());
    await setDoc(doc(db, "users/bob/alerts/a1"), {
      alertId: "x",
      cardId: "hdfc-millennia",
      sentVia: ["email"],
    });
    await setDoc(doc(db, "users/bob/events/e1"), {
      type: "open",
      at: Timestamp.now(),
      meta: {},
    });
    await setDoc(doc(db, "consents/bob/log/l1"), {
      ...consent(),
      at: Timestamp.now(),
    });
    await setDoc(doc(db, "alerts/p1"), {
      cardId: "hdfc-millennia",
      status: "pending",
    });
  });
});

describe("isolation: a user cannot touch another user's data", () => {
  for (const path of [
    "users/bob",
    "users/bob/cards/c1",
    "users/bob/alerts/a1",
    "users/bob/events/e1",
    "consents/bob/log/l1",
  ]) {
    it(`denies reading ${path} to another user and to signed-out visitors`, async () => {
      await assertFails(getDoc(doc(as(A), path)));
      await assertFails(
        getDoc(doc(env.unauthenticatedContext().firestore(), path)),
      );
    });
  }
  it("denies writing another user's profile and cards", async () => {
    await assertFails(setDoc(doc(as(A), "users/bob"), profile(B)));
    await assertFails(setDoc(doc(as(A), "users/bob/cards/c2"), userCard()));
  });
  it("lets the owner read their own data", async () => {
    await assertSucceeds(getDoc(doc(as(B), "users/bob")));
    await assertSucceeds(getDoc(doc(as(B), "users/bob/cards/c1")));
    await assertSucceeds(getDoc(doc(as(B), "consents/bob/log/l1")));
  });
});

describe("profile and the under-18 gate (Sec 6.1)", () => {
  it("allows an adult to create a profile", async () => {
    await assertSucceeds(setDoc(doc(as(A), "users/alice"), profile(A)));
  });
  it("allows someone who turned 18 last month", async () => {
    await assertSucceeds(
      setDoc(doc(as(A), "users/alice"), profile(A, turned18LastMonth)),
    );
  });
  it("denies someone whose 18th birthday month is this month", async () => {
    await assertFails(
      setDoc(
        doc(as(A), "users/alice"),
        profile(A, { dobYear: thisYear - 18, dobMonth: thisMonth }),
      ),
    );
  });
  it("denies a 16-year-old", async () => {
    await assertFails(
      setDoc(doc(as(A), "users/alice"), profile(A, { dobYear: thisYear - 16 })),
    );
  });
  it("denies a profile without a birth month, an unknown field, or someone else's email", async () => {
    const noMonth = without(profile(A), "dobMonth");
    await assertFails(setDoc(doc(as(A), "users/alice"), noMonth));
    await assertFails(
      setDoc(doc(as(A), "users/alice"), profile(A, { phone: "9999999999" })),
    );
    await assertFails(setDoc(doc(as(A), "users/alice"), profile(B)));
  });
  it("lets the owner change their name but not their email or birth date", async () => {
    const db = as(B);
    await assertSucceeds(
      updateDoc(doc(db, "users/bob"), { displayName: "Bob K" }),
    );
    await assertFails(
      updateDoc(doc(db, "users/bob"), { email: "other@example.com" }),
    );
    await assertFails(updateDoc(doc(db, "users/bob"), { dobYear: 1990 }));
  });
  it("lets the owner delete their profile (Sec 11.4)", async () => {
    await assertSucceeds(deleteDoc(doc(as(B), "users/bob")));
  });
});

describe("nothing is stored before an adult profile exists (Sec 6.1, Sec 11.3)", () => {
  it("denies cards and events for a signed-in user with no profile", async () => {
    await assertFails(setDoc(doc(as(A), "users/alice/cards/c1"), userCard()));
    await assertFails(
      addDoc(collection(as(A), "users/alice/events"), {
        type: "open",
        at: serverTimestamp(),
        meta: {},
      }),
    );
  });
});

describe("held cards store no sensitive card data (Sec 2.1)", () => {
  // Card documents live under their catalogue id.
  const put = (data: Record<string, unknown>) =>
    setDoc(doc(as(B), `users/bob/cards/${String(data.cardId ?? "hdfc-millennia")}`), data);
  it("allows the product, an optional last four digits and the engine inputs", async () => {
    await assertSucceeds(
      put(
        userCard({
          last4: "1234",
          ytdSpendRs: 50000,
          capUsedRs: { other: 100 },
          statementDay: 12,
        }),
      ),
    );
  });
  it("rejects a last four that is not exactly four digits", async () => {
    await assertFails(put(userCard({ last4: "12345" })));
    await assertFails(put(userCard({ last4: "12a4" })));
  });
  it("rejects a card number, expiry, CVV or any unknown field", async () => {
    await assertFails(put(userCard({ cardNumber: "4111111111111111" })));
    await assertFails(put(userCard({ expiry: "12/29" })));
    await assertFails(put(userCard({ cvv: "123" })));
    await assertFails(put(userCard({ notes: "anything" })));
  });
  it("stores each card under its own product id, so one product cannot be held twice", async () => {
    await assertFails(setDoc(doc(as(B), "users/bob/cards/other-id"), userCard()));
  });
  it("needs the product; the fee month is optional but must be 1 to 12", async () => {
    await assertFails(put({ anniversaryMonth: 3 }));
    await assertSucceeds(put({ cardId: "hdfc-millennia" }));
    await assertFails(put(userCard({ anniversaryMonth: 13 })));
  });
});

describe("alerts", () => {
  it("lets the owner mark a fan-out alert read, and nothing else", async () => {
    const db = as(B);
    await assertSucceeds(
      updateDoc(doc(db, "users/bob/alerts/a1"), { readAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(db, "users/bob/alerts/a1"), { cardId: "other" }),
    );
    await assertFails(setDoc(doc(db, "users/bob/alerts/a2"), { alertId: "y" }));
    await assertFails(deleteDoc(doc(db, "users/bob/alerts/a1")));
  });
  it("lets an admin read alerts but never write them: decisions go through approveAlert", async () => {
    await assertSucceeds(getDoc(doc(as(B, { admin: true }), "alerts/p1")));
    await assertFails(updateDoc(doc(as(B, { admin: true }), "alerts/p1"), { status: "approved" }));
    await assertFails(setDoc(doc(as(B, { admin: true }), "alerts/p2"), { status: "pending" }));
  });
  it("keeps pending alerts admin-only", async () => {
    await assertFails(getDoc(doc(as(B), "alerts/p1")));
    await assertSucceeds(getDoc(doc(as(B, { admin: true }), "alerts/p1")));
  });
});

describe("events", () => {
  it("lets the owner add events but not change or delete them", async () => {
    const db = as(B);
    await assertSucceeds(
      addDoc(collection(db, "users/bob/events"), {
        type: "checkup",
        at: serverTimestamp(),
        meta: {},
      }),
    );
    await assertFails(updateDoc(doc(db, "users/bob/events/e1"), { type: "x" }));
    await assertFails(deleteDoc(doc(db, "users/bob/events/e1")));
  });
});

describe("consent log is append-only (Sec 6.4, Sec 11.2)", () => {
  const log = (u = B) => collection(as(u), `consents/${u.uid}/log`);
  it("accepts a well-formed consent and a later withdrawal", async () => {
    await assertSucceeds(
      addDoc(log(), consent({ purpose: "marketing", granted: false })),
    );
    await assertSucceeds(
      addDoc(log(), consent({ purpose: "alerts_email", granted: false })),
    );
  });
  it("rejects a bad purpose, a missing field, an extra field or a back-dated time", async () => {
    await assertFails(addDoc(log(), consent({ purpose: "sell_data" })));
    const missing = without(consent(), "userAgentHash");
    await assertFails(addDoc(log(), missing));
    await assertFails(addDoc(log(), consent({ email: "bob@example.com" })));
    await assertFails(addDoc(log(), consent({ at: Timestamp.fromMillis(0) })));
  });
  it("never allows an update or delete, even by the owner", async () => {
    await assertFails(
      updateDoc(doc(as(B), "consents/bob/log/l1"), { granted: false }),
    );
    await assertFails(deleteDoc(doc(as(B), "consents/bob/log/l1")));
  });
  it("denies writing to another user's log", async () => {
    await assertFails(addDoc(collection(as(A), "consents/bob/log"), consent()));
  });
});

describe("everything else is denied", () => {
  it("denies an unlisted collection", async () => {
    await assertFails(setDoc(doc(as(B), "catalogue/x"), { a: 1 }));
  });
});
