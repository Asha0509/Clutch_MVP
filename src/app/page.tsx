import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Minimal landing (PRD Sec 4 journey 1). The full landing and demo mode are Sec 13 step 9.
export default function Home() {
  return (
    <section className="space-y-6 py-10">
      <h1 className="text-3xl font-semibold leading-tight">
        See what your credit cards are quietly costing you, in rupees.
      </h1>
      <p className="text-muted-foreground">
        Pick the cards you hold. Clutch shows fees you can still avoid, points
        about to expire and milestones within reach, using the banks&apos; own
        terms.
      </p>
      <Link href="/start" className={buttonVariants({ size: "lg" })}>
        Check my cards
      </Link>
    </section>
  );
}
