import { Suspense } from "react";
import { VerdictScreen } from "@/components/screens/verdict-screen";

// The screen reads today's date while rendering; Suspense lets Next defer it (cacheComponents is on).
export default function VerdictPage() {
  return (
    <Suspense
      fallback={<p className="py-10 text-muted-foreground">Loading…</p>}
    >
      <VerdictScreen />
    </Suspense>
  );
}
