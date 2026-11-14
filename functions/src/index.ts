import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { impactOfChange } from "../../src/engine/impact";
import { type Change, SpendProfile, UserCard } from "../../src/engine/types";
import { catalogue } from "../../src/lib/catalogue";
import { ApproveInput } from "./approve";
import { type AlertFacts, alertEmail } from "./email";
import { alertsFromFeed, type PendingAlert } from "./feed";

// PRD Sec 5 and Sec 10. Region close to users in India.
setGlobalOptions({ region: "asia-south1" });
initializeApp();
const db = getFirestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const FEED_URL = defineString("FEED_URL", {
  default: "https://cardadvisor.in/data/changes.json",
});
const EMAIL_FROM = defineString("EMAIL_FROM", { default: "" });
const emulated = process.env.FUNCTIONS_EMULATOR === "true";

// Sec 10.8 and CLAUDE.md: logs carry a hashed user id, never the uid, email or card details.
const userHash = (uid: string): string =>
  createHash("sha256").update(uid).digest("hex").slice(0, 16);
function logSend(entry: Record<string, unknown>): void {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  console.log(line);
  if (!emulated) return;
  try {
    mkdirSync("../logs", { recursive: true });
    appendFileSync("../logs/sends.jsonl", `${line}\n`);
  } catch {
    // Local log file is a convenience only.
  }
}

// Resend in production. Without a key, the emulator writes to an outbox collection instead
// (Founder decision); production without a key sends nothing and says so in the log.
async function sendEmail(
  to: string,
  subject: string,
  text: string,
  alertId: string,
  uid: string,
): Promise<boolean> {
  let key = "";
  try {
    key = RESEND_API_KEY.value();
  } catch {
    key = "";
  }
  const base = { user: userHash(uid), alertId, channel: "email" };
  if (!key) {
    if (!emulated) {
      logSend({ ...base, result: "skipped-no-key" });
      return false;
    }
    await db
      .collection("outbox")
      .add({ to, subject, text, alertId, at: FieldValue.serverTimestamp() });
    logSend({ ...base, result: "outbox" });
    return true;
  }
  if (!EMAIL_FROM.value()) {
    logSend({ ...base, result: "skipped-no-from-address" });
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM.value(), to: [to], subject, text }),
  });
  logSend({ ...base, result: res.ok ? "sent" : `failed-${res.status}` });
  return res.ok;
}

// Sec 10.1, Founder decision: fetch the live feed daily. A feed entry is a trigger only; every alert
// is written as pending and nothing is sent until the Founder approves it (Sec 2.6).
export const ingestChangeFeed = onSchedule(
  { schedule: "0 6 * * *", timeZone: "Asia/Kolkata" },
  async () => {
    const res = await fetch(FEED_URL.value());
    if (!res.ok) {
      console.error(
        JSON.stringify({
          job: "ingestChangeFeed",
          result: `fetch-failed-${res.status}`,
        }),
      );
      return;
    }
    const ids = new Set(catalogue.cards.map((c) => c.id));
    let created = 0;
    for (const { id, alert } of alertsFromFeed(await res.json(), ids)) {
      try {
        await db
          .doc(`alerts/${id}`)
          .create({ ...alert, createdAt: FieldValue.serverTimestamp() });
        created += 1;
      } catch (e) {
        if ((e as { code?: number }).code !== 6) throw e; // 6 = already exists: seen before, leave it alone.
      }
    }
    console.log(JSON.stringify({ job: "ingestChangeFeed", created }));
  },
);

// Sec 10.2 and 10.3: admin-only. Approve fans the alert out to every holder with the engine's rupee
// impact for that user; email goes only to users whose latest alerts_email consent is a yes.
type Approved = {
  alert: PendingAlert;
  issuerUrl: string;
  verificationTier: AlertFacts["verificationTier"];
  change: Change;
};

export const approveAlert = onCall(
  // Large fan-outs can take a while; "resume" finishes any that still time out.
  { secrets: [RESEND_API_KEY], timeoutSeconds: 540 },
  async (req) => {
    if (req.auth?.token.admin !== true)
      throw new HttpsError(
        "permission-denied",
        "Only the Founder can approve alerts.",
      );
    const parsed = ApproveInput.safeParse(req.data);
    if (!parsed.success)
      throw new HttpsError(
        "invalid-argument",
        "Check the form: notice link, the check box and a change that differs.",
      );
    const input = parsed.data;
    const ref = db.doc(`alerts/${input.alertId}`);

    const approved = await db.runTransaction(
      async (tx): Promise<Approved | null> => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "No such alert.");
        const status = snap.get("status");
        if (input.decision === "resume") {
          if (status !== "approved")
            throw new HttpsError(
              "failed-precondition",
              "Only an approved alert can be resumed.",
            );
          return {
            alert: snap.data() as PendingAlert,
            issuerUrl: snap.get("issuerUrl"),
            verificationTier: snap.get("verification"),
            change: snap.get("change"),
          };
        }
        if (status !== "pending")
          throw new HttpsError(
            "failed-precondition",
            "This alert was already decided.",
          );
        if (input.decision === "reject") {
          tx.update(ref, {
            status: "rejected",
            decidedBy: req.auth?.uid,
            decidedAt: FieldValue.serverTimestamp(),
          });
          return null;
        }
        tx.update(ref, {
          status: "approved",
          approvedBy: req.auth?.uid,
          approvedAt: FieldValue.serverTimestamp(),
          issuerUrl: input.issuerUrl,
          verification: input.verificationTier,
          change: input.change,
        });
        return {
          alert: snap.data() as PendingAlert,
          issuerUrl: input.issuerUrl,
          verificationTier: input.verificationTier,
          change: input.change,
        };
      },
    );
    if (!approved) return { status: "rejected", notified: 0, emailed: 0 };
    return { status: "approved", ...(await fanOut(input.alertId, approved)) };
  },
);

// Sec 10.3. Once per user, even if a card record is duplicated. Each user's alert document is created
// before any email, so a retry or "resume" never emails anyone twice. One failed send does not stop the rest.
async function fanOut(
  alertId: string,
  a: Approved,
): Promise<{ notified: number; emailed: number }> {
  const card = catalogue.cards.find((c) => c.id === a.alert.cardId);
  if (!card) return { notified: 0, emailed: 0 };
  const holders = await db
    .collectionGroup("cards")
    .where("cardId", "==", a.alert.cardId)
    .get();
  const seen = new Set<string>();
  let notified = 0;
  let emailed = 0;
  for (const h of holders.docs) {
    const uid = h.ref.parent.parent?.id;
    const userCard = UserCard.safeParse(h.data());
    if (!uid || seen.has(uid) || !userCard.success) continue;
    seen.add(uid);
    const user = await db.doc(`users/${uid}`).get();
    if (!user.exists) continue;
    const profile = SpendProfile.safeParse(user.get("spendProfile") ?? {});
    const { rupeesPerYear } = impactOfChange(
      { ...userCard.data, card },
      a.change,
      profile.success ? profile.data : {},
    );

    const mine = db.doc(`users/${uid}/alerts/${alertId}`);
    try {
      await mine.create({
        alertId,
        cardId: a.alert.cardId,
        title: a.alert.title,
        before: a.alert.before,
        after: a.alert.after,
        issuerUrl: a.issuerUrl,
        rupeesPerYear,
        sentVia: [],
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      if ((e as { code?: number }).code === 6) continue; // already told on an earlier run
      throw e;
    }
    notified += 1;

    const consent = await db
      .collection(`consents/${uid}/log`)
      .where("purpose", "==", "alerts_email")
      .orderBy("at", "desc")
      .limit(1)
      .get();
    const email = user.get("email");
    if (consent.docs[0]?.get("granted") !== true || typeof email !== "string")
      continue;
    const { subject, text } = alertEmail({
      cardName: card.name,
      title: a.alert.title,
      before: a.alert.before,
      after: a.alert.after,
      issuerUrl: a.issuerUrl,
      verificationTier: a.verificationTier,
      rupeesPerYear,
    });
    try {
      if (await sendEmail(email, subject, text, alertId, uid)) {
        await mine.update({ sentVia: ["email"] });
        emailed += 1;
      }
    } catch {
      logSend({
        user: userHash(uid),
        alertId,
        channel: "email",
        result: "failed-network",
      });
    }
  }
  return { notified, emailed };
}
