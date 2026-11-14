import { BellRing, CreditCard, IndianRupee, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { catalogue } from "@/lib/catalogue";

const STEPS = [
  {
    icon: CreditCard,
    title: "Pick the cards you hold",
    body: "No bank login, no SMS reading, no card numbers. Just the card names, and the last four digits if you like.",
  },
  {
    icon: IndianRupee,
    title: "See what is at risk, in rupees",
    body: "Fees you can still avoid, points about to expire, milestones within reach, and which card to use for each payment.",
  },
  {
    icon: BellRing,
    title: "Hear when a bank changes the rules",
    body: "What changed on a card you hold, what it means for your spend, and a link to the bank's own notice.",
  },
];

// Landing for the investor showcase (PRD Sec 3.3, Sec 13 step 9). Copy checked against Sec 2.1.
export default function Home() {
  return (
    <section className="space-y-12 py-10">
      <div className="space-y-5">
        <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          Working prototype · pilot stage
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          See what your credit cards are{" "}
          <span className="underline decoration-accent decoration-4 underline-offset-4">
            quietly costing you
          </span>
          , in rupees.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          For people in India who hold more than one credit card. Clutch reads
          each bank&apos;s published terms, works on the cards you actually hold
          and your own spend, and tells you, card by card, what to do next.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/start" className={buttonVariants({ size: "lg" })}>
            Try it with your cards
          </Link>
          <Link
            href="/demo/checkup"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Guided 2-minute demo
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          No sign-in. Your cards stay in this browser.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">
            Cards checked field by field against the bank&apos;s own terms
          </dt>
          <dd className="text-3xl font-semibold">{catalogue.cards.length}</dd>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">
            Changes to Indian credit cards in the{" "}
            <a className="underline" href="https://cardadvisor.in/data">
              CardAdvisor public log
            </a>{" "}
            (checked 14 Nov 2026)
          </dt>
          <dd className="text-3xl font-semibold">844</dd>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">
            Bank logins, SMS or card numbers asked for
          </dt>
          <dd className="text-3xl font-semibold">None</dd>
        </div>
      </dl>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="space-y-3 rounded-xl border bg-card p-5 shadow-sm"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <s.icon className="size-5" aria-hidden />
            </span>
            <h2 className="font-semibold">
              {i + 1}. {s.title}
            </h2>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="flex gap-4 rounded-xl bg-primary p-5 text-primary-foreground">
        <ShieldCheck
          className="mt-0.5 size-6 shrink-0 text-accent"
          aria-hidden
        />
        <div className="space-y-1">
          <h2 className="font-semibold">
            Every rupee comes from a tested engine
          </h2>
          <p className="text-sm opacity-85">
            A rules engine, not a chatbot, works out each figure from the
            bank&apos;s terms and the numbers you enter, and shows its working.
            Rule changes reach you only after a person checks them against the
            bank&apos;s notice. Alerts never contain offers.
          </p>
        </div>
      </div>
    </section>
  );
}
