import { Suspense } from "react";
import { StartFlow } from "@/components/screens/start-flow";

// The screen reads today's date while rendering; Suspense lets Next defer it (cacheComponents is on).
export default function StartPage() {
  return (
    <Suspense
      fallback={<p className="py-10 text-muted-foreground">Loading…</p>}
    >
      <StartFlow />
    </Suspense>
  );
}
