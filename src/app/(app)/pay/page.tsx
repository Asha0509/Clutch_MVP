import { Suspense } from "react";
import { PayScreen } from "@/components/screens/pay-screen";

// The screen reads today's date while rendering; Suspense lets Next defer it (cacheComponents is on).
export default function PayPage() {
  return (
    <Suspense
      fallback={<p className="py-10 text-muted-foreground">Loading…</p>}
    >
      <PayScreen />
    </Suspense>
  );
}
