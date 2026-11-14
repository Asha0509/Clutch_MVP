"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/cards", label: "My cards" },
  { href: "/checkup", label: "Checkup" },
  { href: "/pay", label: "Pay with" },
  { href: "/verdict", label: "Verdict" },
  { href: "/admin", label: "Founder console" },
] as const;

export function AppNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Prototype"
      className="-mx-4 mb-4 overflow-x-auto border-b bg-card px-4 sm:mx-0 sm:mt-4 sm:rounded-lg sm:border"
    >
      <ul className="flex gap-1 py-1.5">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={path === l.href ? "page" : undefined}
              className="block whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
