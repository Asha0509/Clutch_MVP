"use client";

import { PayView } from "@/components/views/pay-view";
import { toHeld } from "@/lib/held";
import { Gate } from "./gate";

// PRD F8 on the visitor's own cards (browser storage).
export function PayScreen() {
  return <Gate>{(s) => <PayView held={toHeld(s.cards)} />}</Gate>;
}
