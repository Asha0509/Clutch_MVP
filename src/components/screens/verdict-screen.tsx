"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { VerdictView } from "@/components/views/verdict-view";
import { todayUtc } from "@/lib/age";
import { toHeld } from "@/lib/held";
import { Gate } from "./gate";

// PRD F9 on the visitor's own cards and their own typical month per card.
export function VerdictScreen() {
  return (
    <Gate>
      {(s) => {
        const held = toHeld(s.cards);
        const missing = held.filter(
          (h) => Object.keys(s.profiles[h.cardId] ?? {}).length === 0,
        );
        return (
          <section className="space-y-6 py-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Keep, downgrade or close</h1>
              <p className="text-muted-foreground">
                From a typical month on each card. Change the spend on My cards
                and this updates.
              </p>
            </div>
            {held.length === 0 ? (
              <Link href="/cards" className={buttonVariants({ size: "lg" })}>
                Add cards
              </Link>
            ) : (
              <>
                {missing.length > 0 && (
                  <p className="rounded-md border-l-4 border-warning bg-card p-3 text-sm">
                    No typical month yet for{" "}
                    {missing.map((h) => h.card.name).join(", ")}. Add it under
                    My cards, Add details.
                  </p>
                )}
                <VerdictView
                  held={held}
                  profiles={s.profiles}
                  today={todayUtc(new Date())}
                />
              </>
            )}
          </section>
        );
      }}
    </Gate>
  );
}
