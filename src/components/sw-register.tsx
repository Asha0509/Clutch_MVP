"use client";

import { useEffect } from "react";

// Offline demo (PRD Sec 13 step 9): production builds only, so development and the emulator tests
// never run against a cached copy.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
