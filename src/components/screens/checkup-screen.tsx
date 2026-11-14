"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { CheckupView } from "@/components/views/checkup-view";
import type { UserCard } from "@/engine/types";
import { todayUtc } from "@/lib/age";
import { toHeld } from "@/lib/held";
import { useProfileUser } from "@/lib/use-user";
import { type UserAlert, watchAlerts, watchCards } from "@/lib/user-data";

// Live data for the checkup view (PRD F3): only signed-in users with a profile (Sec 6.1).
export function CheckupScreen() {
  const user = useProfileUser();
  const [cards, setCards] = useState<UserCard[] | null>(null);
  const [alerts, setAlerts] = useState<UserAlert[]>([]);

  useEffect(() => {
    if (!user) return;
    return watchCards(user.uid, setCards);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    return watchAlerts(user.uid, setAlerts);
  }, [user]);

  if (!user || cards === null)
    return <p className="py-10 text-muted-foreground">Loading…</p>;

  const held = toHeld(cards);
  if (held.length === 0)
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-2xl font-semibold">Your checkup</h1>
        <p className="text-muted-foreground">Add the cards you hold first.</p>
        <Link href="/cards" className={buttonVariants({ size: "lg" })}>
          Add cards
        </Link>
      </section>
    );

  return (
    <section className="space-y-8 py-6">
      <CheckupView held={held} alerts={alerts} today={todayUtc(new Date())} />
      <div className="flex flex-wrap gap-3">
        <Link href="/pay" className={buttonVariants()}>
          Which card to pay with
        </Link>
        <Link
          href="/cards"
          className={buttonVariants({ variant: "secondary" })}
        >
          Edit my cards
        </Link>
      </div>
    </section>
  );
}
