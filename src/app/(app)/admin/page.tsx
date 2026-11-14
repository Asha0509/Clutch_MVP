import { Suspense } from "react";
import { AdminScreen } from "@/components/screens/admin-screen";

// Founder console (PRD F13). Prototype: open to the visitor, approvals stay in this browser.
export default function AdminPage() {
  return (
    <Suspense
      fallback={<p className="py-10 text-muted-foreground">Loading…</p>}
    >
      <AdminScreen />
    </Suspense>
  );
}
