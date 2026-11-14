import { AppNav } from "@/components/app-nav";

// The working prototype's screens share one nav. Data lives in this browser only (no sign-in).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
