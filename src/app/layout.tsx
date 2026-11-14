import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="mx-auto w-full max-w-2xl px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Clutch
          </Link>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-2xl space-y-1 px-4 py-6 text-xs text-muted-foreground">
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
