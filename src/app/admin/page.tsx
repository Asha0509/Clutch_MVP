import { Suspense } from "react";
import { AdminScreen } from "@/components/screens/admin-screen";

// Founder-only (PRD Sec 6.2, F13). The admin claim is checked here for display and again on the server.
export default function AdminPage() {
  return (
    <Suspense
      fallback={<p className="py-10 text-muted-foreground">Loading…</p>}
    >
      <AdminScreen />
    </Suspense>
  );
}
