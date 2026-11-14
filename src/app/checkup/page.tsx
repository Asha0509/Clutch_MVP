import { Suspense } from "react";
import { CheckupScreen } from "@/components/screens/checkup-screen";

// The screen reads today's date while rendering; Suspense lets Next defer it (cacheComponents is on).
export default function CheckupPage() {
  return (
    <Suspense
      fallback={<p className="py-10 text-muted-foreground">Loading…</p>}
    >
      <CheckupScreen />
    </Suspense>
  );
}
