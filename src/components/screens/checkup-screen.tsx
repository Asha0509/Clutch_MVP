"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CheckupView } from "@/components/views/checkup-view";
import { todayUtc } from "@/lib/age";
import { toHeld } from "@/lib/held";
import { Gate } from "./gate";

// PRD F3 on the visitor's own cards, recomputed by the engine on every change (browser storage).
export function CheckupScreen() {
  return (
    <Gate>
      {(s) => {
        const held = toHeld(s.cards);
        if (held.length === 0)
          return (
            <section className="space-y-4 py-10">
              <h1 className="text-2xl font-semibold">Your checkup</h1>
              <p className="text-muted-foreground">
                Add the cards you hold first.
              </p>
              <Link href="/cards" className={buttonVariants({ size: "lg" })}>
                Add cards
              </Link>
            </section>
          );
        return (
          <section className="space-y-8 py-6">
            <CheckupView
              held={held}
              alerts={s.alerts}
              today={todayUtc(new Date())}
            />
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
      }}
    </Gate>
  );
}
