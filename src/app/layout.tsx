import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { getViewer } from "@/lib/supabase/server";
import "./globals.css";

const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const source = Source_Sans_3({ variable: "--font-source", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ArconEr Cup", template: "%s · ArconEr Cup" },
  description: "Arcon vs 838. Hayward, Wisconsin. Every September since 2001.",
  metadataBase: new URL("https://arconer.vercel.app"),
};

const nav = [
  { href: "/next", label: "Next Cup" },
  { href: "/#history", label: "History" },
  { href: "/players", label: "Players" },
  { href: "/photos", label: "Photos" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { profile } = await getViewer();
  return (
    <html lang="en" className={`${playfair.variable} ${source.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <header className="bg-ink text-paper">
          <div className="mx-auto max-w-6xl px-4 flex items-center gap-4 h-16">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- ponytail: static asset, Next's image optimizer flattens its transparency */}
              <img src="/logo-mark.webp" alt="" className="h-9 w-auto" />
              <span className="font-display text-xl tracking-wide">ArconEr Cup</span>
            </Link>
            <nav className="hidden md:flex gap-5 ml-6 text-sm uppercase tracking-[0.12em]">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-gold">
                  {n.label}
                </Link>
              ))}
              {profile?.role === "admin" && (
                <Link href="/admin" className="text-gold hover:text-paper">
                  Admin
                </Link>
              )}
            </nav>
            <div className="ml-auto">
              <AuthButton profile={profile} />
            </div>
          </div>
          <nav className="md:hidden flex gap-4 overflow-x-auto px-4 pb-3 text-xs uppercase tracking-[0.12em]">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="shrink-0">
                {n.label}
              </Link>
            ))}
            {profile?.role === "admin" && (
              <Link href="/admin" className="shrink-0 text-gold">
                Admin
              </Link>
            )}
          </nav>
          <div className="h-1 flex">
            <div className="flex-1 bg-arcon" />
            <div className="flex-1 bg-blue" />
          </div>
        </header>
        {profile?.role === "pending" && (
          <div className="bg-gold/15 text-ink text-sm text-center py-2 px-4">
            Thanks for signing in. An admin will link your account to your player so you can post photos and comments.
          </div>
        )}
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16 py-8 text-center text-sm text-muted">
          Arcon vs ER Systems / 838 Coatings · Hayward, Wisconsin · Since 2001
        </footer>
      </body>
    </html>
  );
}
