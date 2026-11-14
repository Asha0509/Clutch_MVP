import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DemoStep } from "@/components/demo/demo-step";
import { DEMO_STEPS } from "@/lib/demo-steps";

export function generateStaticParams() {
  return DEMO_STEPS.map((s) => ({ step: s.slug }));
}

// The step reads today's date while rendering; Suspense lets Next defer it (cacheComponents is on).
export default async function DemoStepPage({
  params,
}: PageProps<"/demo/[step]">) {
  const { step } = await params;
  if (!DEMO_STEPS.some((s) => s.slug === step)) notFound();
  return (
    <Suspense
      fallback={<p className="py-10 text-muted-foreground">Loading…</p>}
    >
      <DemoStep slug={step} />
    </Suspense>
  );
}
