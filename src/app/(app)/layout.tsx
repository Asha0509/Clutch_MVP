import Link from "next/link";

const LINKS = [
  { href: "/cards", label: "My cards" },
  { href: "/checkup", label: "Checkup" },
  { href: "/pay", label: "Pay with" },
  { href: "/verdict", label: "Verdict" },
  { href: "/admin", label: "Founder console" },
] as const;

// The working prototype's screens share one nav. Data lives in this browser only (no sign-in).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <nav aria-label="Prototype" className="-mx-1 flex flex-wrap gap-1 pb-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
