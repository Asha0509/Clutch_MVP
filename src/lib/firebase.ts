import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

// Emulators unless real config is present (CLAUDE.md: work against the emulators). The demo- project id
// keeps the SDK from ever reaching a real project.
const useEmulators =
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" ||
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const config = useEmulators
  ? {
      apiKey: "demo-key",
      authDomain: "demo-clutch.firebaseapp.com",
      projectId: "demo-clutch",
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    };

const app = getApps()[0] ?? initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Same region as functions/src/index.ts.
export const functions = getFunctions(app, "asia-south1");

// Hot reload re-runs this module; connecting twice throws.
const flag = globalThis as { __clutchEmulators?: boolean };
if (useEmulators && !flag.__clutchEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  flag.__clutchEmulators = true;
}
