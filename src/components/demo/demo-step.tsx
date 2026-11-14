"use client";

import { useMemo } from "react";
import {
  AtRiskSummary,
  CardSummary,
  ChangeList,
} from "@/components/views/checkup-view";
import { PayView } from "@/components/views/pay-view";
import { VerdictView } from "@/components/views/verdict-view";
import { todayUtc } from "@/lib/age";
import { demoUser } from "@/lib/demo";

// One demo step, built from the same views as the live app, fed by demoUser() instead of Firebase.
export function DemoStep({ slug }: { slug: string }) {
  const today = useMemo(() => todayUtc(new Date()), []);
  const demo = useMemo(() => demoUser(today), [today]);
  const millennia = demo.held.find((h) => h.cardId === "hdfc-millennia");

  if (slug === "checkup")
    return <AtRiskSummary held={demo.held} today={today} />;
  if (slug === "change") return <ChangeList alerts={demo.alerts} />;
  if (slug === "waiver" && millennia)
    return (
      <>
        <h1 className="text-2xl font-semibold">Fee waiver</h1>
        <CardSummary h={millennia} today={today} />
      </>
    );
  if (slug === "pay")
    return (
      <PayView
        held={demo.held}
        initial={{ category: "groceries", amount: "2000", channel: "upi" }}
      />
    );
  return (
    <>
      <h1 className="text-2xl font-semibold">Keep, downgrade or close</h1>
      <VerdictView held={demo.held} profiles={demo.profiles} today={today} />
    </>
  );
}
