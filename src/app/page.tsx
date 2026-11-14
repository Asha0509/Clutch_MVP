import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const STEPS = [
  {
    title: "Pick the cards you hold",
    body: "No bank login, no SMS reading, no card numbers. Just the card names, and the last four digits if you like.",
  },
  {
    title: "See what is at risk, in rupees",
    body: "Fees you can still avoid, points about to expire, milestones within reach, and which card to use for each payment.",
  },
  {
    title: "Hear when a bank changes the rules",
    body: "What changed on a card you hold, what it means for your spend, and a link to the bank's own notice.",
  },
];

// Landing for the investor showcase (PRD Sec 3.3, Sec 13 step 9). Copy checked against Sec 2.1.
export default function Home() {
  return (
    <section className="space-y-10 py-10">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          See what your credit cards are quietly costing you, in rupees.
        </h1>
        <p className="text-lg text-muted-foreground">
          For people in India who hold more than one credit card. Clutch reads
          each bank&apos;s published terms and tells you, card by card, what to
          do next.
        </p>
        <p className="text-sm text-muted-foreground">
          Card rules change often: the{" "}
          <a className="underline" href="https://cardadvisor.in/data">
            CardAdvisor public change log
          </a>{" "}
          records more than 800 rule changes across Indian credit cards.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/demo/checkup" className={buttonVariants({ size: "lg" })}>
            See the 2-minute demo
          </Link>
          <Link
            href="/start"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Live mode (needs local setup)
          </Link>
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="space-y-2 rounded-lg border bg-card p-4">
            <span className="text-sm text-muted-foreground">{i + 1}</span>
            <h2 className="font-medium">{s.title}</h2>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted-foreground">
        A pilot-stage product. Card facts are checked against each bank&apos;s
        own documents.
      </p>
    </section>
  );
}
