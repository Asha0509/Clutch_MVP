import { expect, type Page } from "@playwright/test";

// The emulator's own Google popup proved unreliable to drive (build log 2026-11-14). The test checks the
// button opens Google with no extra scopes (PRD Sec 6.1), then signs in through the Auth emulator's REST API
// and stores that session where the Firebase SDK keeps it, exactly as a finished popup sign-in would.
export async function signIn(page: Page, email: string): Promise<string> {
  await page.goto("/start");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const popup = await popupPromise;
  const url = new URL(popup.url());
  expect(url.searchParams.get("providerId")).toBe("google.com");
  expect(url.searchParams.get("scopes")).toBe("profile");
  await popup.close();
  return storeSession(page, email);
}

// Signs in through the Auth emulator's REST API and stores the session where the Firebase SDK keeps it.
// Calling it again gives a fresh token, for example after custom claims change.
export async function storeSession(page: Page, email: string): Promise<string> {
  const idToken = JSON.stringify({
    sub: email,
    email,
    email_verified: true,
    name: "Test User",
  });
  const res = await page.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key",
    {
      data: {
        postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
        requestUri: "http://localhost",
        returnSecureToken: true,
      },
    },
  );
  const s = await res.json();
  await page.evaluate(
    async (user) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("firebaseLocalStorageDb", 1);
        open.onupgradeneeded = () =>
          open.result.createObjectStore("firebaseLocalStorage", {
            keyPath: "fbase_key",
          });
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(
            "firebaseLocalStorage",
            "readwrite",
          );
          tx.objectStore("firebaseLocalStorage").put({
            fbase_key: "firebase:authUser:demo-key:[DEFAULT]",
            value: user,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    {
      uid: s.localId,
      email: s.email,
      emailVerified: true,
      displayName: "Test User",
      isAnonymous: false,
      providerData: [
        {
          providerId: "google.com",
          uid: email,
          displayName: "Test User",
          email: s.email,
          phoneNumber: null,
          photoURL: null,
        },
      ],
      stsTokenManager: {
        refreshToken: s.refreshToken,
        accessToken: s.idToken,
        expirationTime: Date.now() + 3_600_000,
      },
      createdAt: String(Date.now()),
      lastLoginAt: String(Date.now()),
      apiKey: "demo-key",
      appName: "[DEFAULT]",
    },
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign in to check your cards" }),
  ).toBeHidden({ timeout: 30_000 });
  return s.localId as string;
}

export async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

export async function shoot(page: Page, name: string) {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await noHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/screens/${name}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 375, height: 900 });
}

// Answers the age question as an adult and accepts the notice, ending on the My cards screen.
export async function onboardAdult(
  page: Page,
  email: string,
  opts: { emailAlerts?: boolean } = {},
): Promise<string> {
  const uid = await signIn(page, email);
  await expect(
    page.getByRole("heading", { name: "When were you born?" }),
  ).toBeVisible();
  await page.getByLabel("Month").selectOption("1");
  await page.getByLabel("Year").selectOption("1990");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Before you add cards" }),
  ).toBeVisible();
  if (opts.emailAlerts)
    await page
      .getByRole("switch", { name: /Email me when a card I hold changes/ })
      .click();
  await page.getByRole("button", { name: "Agree and continue" }).click();
  await expect(page.getByRole("heading", { name: "My cards" })).toBeVisible();
  return uid;
}

// One tap per card on the My cards screen.
export async function addCards(page: Page, names: string[]) {
  for (const name of names)
    await page
      .getByRole("button", { name: new RegExp(name.replace("+", "\\+")) })
      .click();
  await expect(
    page.getByRole("list", { name: "Cards you hold" }).getByRole("listitem"),
  ).toHaveCount(names.length);
}

// Emulator REST helpers. "Bearer owner" bypasses security rules in the emulators only.
const OWNER = { Authorization: "Bearer owner" };
const FS =
  "http://127.0.0.1:8080/v1/projects/demo-clutch/databases/(default)/documents";

export async function makeAdmin(page: Page, uid: string) {
  const res = await page.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-clutch/accounts:update",
    {
      headers: OWNER,
      data: { localId: uid, customAttributes: JSON.stringify({ admin: true }) },
    },
  );
  expect(res.ok()).toBe(true);
}

export async function seedDoc(
  page: Page,
  path: string,
  fields: Record<string, string>,
) {
  const [col, id] = [
    path.slice(0, path.lastIndexOf("/")),
    path.slice(path.lastIndexOf("/") + 1),
  ];
  const res = await page.request.post(`${FS}/${col}?documentId=${id}`, {
    headers: OWNER,
    data: {
      fields: Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, { stringValue: v }]),
      ),
    },
  });
  expect(res.ok()).toBe(true);
}

export async function listDocs(
  page: Page,
  collectionPath: string,
): Promise<Record<string, unknown>[]> {
  const res = await page.request.get(`${FS}/${collectionPath}?pageSize=300`, {
    headers: OWNER,
  });
  const body = await res.json();
  return (body.documents ?? []).map(
    (d: {
      name: string;
      fields: Record<string, { stringValue?: string }>;
    }) => ({
      id: d.name.split("/").pop(),
      ...Object.fromEntries(
        Object.entries(d.fields ?? {}).map(([k, v]) => [k, v.stringValue ?? v]),
      ),
    }),
  );
}

// Writes a document with typed Firestore values, e.g. { granted: { booleanValue: false } }.
export async function seedTyped(
  page: Page,
  path: string,
  fields: Record<string, Record<string, unknown>>,
) {
  const [col, id] = [
    path.slice(0, path.lastIndexOf("/")),
    path.slice(path.lastIndexOf("/") + 1),
  ];
  const res = await page.request.post(`${FS}/${col}?documentId=${id}`, {
    headers: OWNER,
    data: { fields },
  });
  expect(res.ok()).toBe(true);
}

// Calls a callable function the way the Firebase SDK does, as the signed-in user with this email.
export async function callAs(
  page: Page,
  email: string,
  name: string,
  data: unknown,
) {
  const signInRes = await page.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key",
    {
      data: {
        postBody: `id_token=${encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true }))}&providerId=google.com`,
        requestUri: "http://localhost",
        returnSecureToken: true,
      },
    },
  );
  const { idToken } = await signInRes.json();
  const res = await page.request.post(
    `http://127.0.0.1:5001/demo-clutch/asia-south1/${name}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
      data: { data },
    },
  );
  return { status: res.status(), body: await res.json() };
}
