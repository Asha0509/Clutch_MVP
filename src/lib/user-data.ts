import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { UserCard } from "@/engine/types";
import { db } from "./firebase";
import { ASKED_AT_SIGNUP, NOTICE_VERSION, type Purpose } from "./notice";

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hasProfile(uid: string): Promise<boolean> {
  return (await getDoc(doc(db, "users", uid))).exists();
}

// One batch: the profile plus one consent-log entry per purpose asked (PRD Sec 11.2). firestore.rules
// refuses the profile for under-18s and checks every consent entry.
export async function createProfileWithConsent(
  user: User,
  dob: { dobYear: number; dobMonth: number },
  choices: Record<Purpose, boolean>,
): Promise<void> {
  if (!user.email) throw new Error("Google did not share an email address.");
  const batch = writeBatch(db);
  batch.set(doc(db, "users", user.uid), {
    createdAt: serverTimestamp(),
    displayName: user.displayName ?? "",
    email: user.email,
    dobYear: dob.dobYear,
    dobMonth: dob.dobMonth,
    locale: "en-IN",
  });
  const userAgentHash = await sha256Hex(navigator.userAgent);
  for (const p of ASKED_AT_SIGNUP)
    batch.set(doc(collection(db, "consents", user.uid, "log")), {
      purpose: p.id,
      granted: p.required || choices[p.id],
      noticeVersion: NOTICE_VERSION,
      at: serverTimestamp(),
      userAgentHash,
    });
  await batch.commit();
}

// Held cards, validated on the way in so the screens only see well-formed data.
export function watchCards(
  uid: string,
  onChange: (cards: UserCard[]) => void,
): () => void {
  return onSnapshot(collection(db, "users", uid, "cards"), (snap) =>
    onChange(
      snap.docs.flatMap((d) => {
        const parsed = UserCard.safeParse(d.data());
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  );
}

// Firestore rejects undefined values, so blanks are dropped. The document id is the catalogue card id.
export async function saveCard(uid: string, card: UserCard): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(UserCard.parse(card)).filter(([, v]) => v !== undefined),
  );
  await setDoc(doc(db, "users", uid, "cards", card.cardId), clean);
}

export async function removeCard(uid: string, cardId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "cards", cardId));
}
