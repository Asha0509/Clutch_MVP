"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AVOID, DEMO_STEPS } from "@/lib/demo-steps";

// PRD Sec 3.3 demo mode: a banner, a five-step bar and presenter notes around each demo screen.
export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [notes, setNotes] = useState(false);
  const i = Math.max(
    0,
    DEMO_STEPS.findIndex((s) => pathname.endsWith(`/${s.slug}`)),
  );
  const step = DEMO_STEPS[i];
  const prev = DEMO_STEPS[i - 1];
  const next = DEMO_STEPS[i + 1];

  return (
    <div className="space-y-6 py-4">
      <p
        className="rounded-md border-l-4 border-warning bg-card p-3 text-sm"
        role="note"
      >
        Demo: a made-up person with three real cards. Spend and dates are
        examples; every figure comes from Clutch&apos;s rules engine and each
        bank&apos;s published terms.
      </p>
      <nav aria-label="Demo steps" className="space-y-3">
        <p className="text-sm text-muted-foreground" data-testid="demo-step">
          Step {i + 1} of {DEMO_STEPS.length}: {step.title}
        </p>
        <ol className="flex gap-1" aria-hidden>
          {DEMO_STEPS.map((s, k) => (
            <li
              key={s.slug}
              className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-primary" : "bg-input"}`}
            />
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          {prev ? (
            <Link
              href={`/demo/${prev.slug}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back
            </Link>
          ) : (
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Exit demo
            </Link>
          )}
          {next ? (
            <Link
              href={`/demo/${next.slug}`}
              className={buttonVariants({ size: "sm" })}
            >
              Next: {next.title}
            </Link>
          ) : (
            <Link href="/" className={buttonVariants({ size: "sm" })}>
              Finish
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotes(!notes)}
            aria-expanded={notes}
          >
            {notes ? "Hide presenter notes" : "Presenter notes"}
          </Button>
        </div>
        {notes && (
          <div
            className="space-y-1 rounded-md bg-muted p-3 text-sm"
            data-testid="presenter-notes"
          >
            <p>{step.say}</p>
            <p className="text-muted-foreground">{AVOID}</p>
          </div>
        )}
      </nav>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
