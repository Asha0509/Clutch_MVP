"use client";

import { useEffect, useState } from "react";
import { PayView } from "@/components/views/pay-view";
import type { UserCard } from "@/engine/types";
import { toHeld } from "@/lib/held";
import { useProfileUser } from "@/lib/use-user";
import { watchCards } from "@/lib/user-data";

// Live data for the pay view: only signed-in users with a profile (Sec 6.1).
export function PayScreen() {
  const user = useProfileUser();
  const [cards, setCards] = useState<UserCard[] | null>(null);
  useEffect(() => {
    if (!user) return;
    return watchCards(user.uid, setCards);
  }, [user]);
  if (!user || cards === null)
    return <p className="py-10 text-muted-foreground">Loading…</p>;
  return <PayView held={toHeld(cards)} />;
}
