// Run by the Founder only, against the project they are logged in to:
//   Use `gcloud auth application-default login` first (no key file on disk).
//   pnpm tsx scripts/make-admin.ts <uid>
export {};
const uid = process.argv[2];
if (!uid) {
  console.error("usage: pnpm tsx scripts/make-admin.ts <uid>");
  process.exit(1);
}
const { initializeApp, applicationDefault } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
initializeApp({ credential: applicationDefault() });
await getAuth().setCustomUserClaims(uid, { admin: true });
console.log(`admin claim set for ${uid}`);
