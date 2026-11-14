import { Suspense } from "react";
import { CardsScreen } from "@/components/screens/cards-screen";

// The screen reads today's date while rendering; Suspense lets Next defer it (cacheComponents is on).
export default function CardsPage() {
  return (
    <Suspense
      fallback={<p className="py-10 text-muted-foreground">Loading…</p>}
    >
      <CardsScreen />
    </Suspense>
  );
}
