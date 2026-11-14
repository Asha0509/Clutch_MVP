"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { hasProfile } from "./user-data";

// undefined while Firebase is still restoring the session, null when signed out.
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}

// For screens that hold user data: only a signed-in user who has passed the age gate and consent
// (that is, has a profile) gets through. Everyone else goes to /start (PRD Sec 6.1, Sec 11.3).
export function useProfileUser(): User | undefined {
  const user = useUser();
  const router = useRouter();
  const [confirmedUid, setConfirmedUid] = useState<string | null>(null);
  useEffect(() => {
    if (user === null) router.replace("/start");
    if (!user) return;
    let live = true;
    hasProfile(user.uid)
      .then((ok) => {
        if (!live) return;
        if (ok) setConfirmedUid(user.uid);
        else router.replace("/start");
      })
      .catch(() => live && router.replace("/start"));
    return () => {
      live = false;
    };
  }, [user, router]);
  return user && confirmedUid === user.uid ? user : undefined;
}
