import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clutch",
  description:
    "What your credit cards cost you, in rupees, and which one to use.",
  icons: {
    icon: "/icons/favicon-64.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Clutch", statusBarStyle: "default" },
};

// Brand navy (CLAUDE.md brand tokens) for the browser and installed-app chrome.
export const viewport: Viewport = { themeColor: "#14213D" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SwRegister />
        <header className="bg-primary text-primary-foreground">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG mark */}
              <img src="/icons/icon.svg" alt="" className="size-7" />
              Clutch
            </Link>
            <span className="hidden text-sm opacity-80 sm:inline">
              An honest friend for your credit cards
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-3xl space-y-1 px-4 py-6 text-xs text-muted-foreground">
          <p>
            Clutch gives information, not financial advice. Check the
            bank&apos;s own terms.
          </p>
          <p>
            Card facts are derived from the{" "}
            <a className="underline" href="https://cardadvisor.in/data">
              CardAdvisor open dataset
            </a>{" "}
            (CC BY 4.0) and checked against each bank&apos;s own documents.
          </p>
        </footer>
      </body>
    </html>
  );
}
