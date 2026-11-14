"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { type LocalState, useLocalStore } from "@/lib/local-store";

// Every prototype screen needs the one-time age check first (PRD Sec 6.1). Nothing is stored before it.
export function Gate({
  children,
}: {
  children: (s: LocalState) => ReactNode;
}) {
  const s = useLocalStore();
  if (!s) return <p className="py-10 text-muted-foreground">Loading…</p>;
  if (!s.adult)
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-2xl font-semibold">One question first</h1>
        <p className="text-muted-foreground">
          Clutch is for people aged 18 and over. No sign-in needed.
        </p>
        <Link href="/start" className={buttonVariants({ size: "lg" })}>
          Start
        </Link>
      </section>
    );
  return <>{children(s)}</>;
}
