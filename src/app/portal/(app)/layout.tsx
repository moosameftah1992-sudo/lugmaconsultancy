import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageToggle, SignOutButton } from "@/components/ui/misc";
import { getT } from "@/i18n/server";
import { requireClient } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My portal", robots: { index: false, follow: false } };

/** Private client area. Contains client navigation only — nothing that points to management tools. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const client = await requireClient();
  const t = await getT();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/portal" aria-label={t("Luqma — my portal", "لقمة — بوابتي")} className="shrink-0">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center">
            <span className="me-2 hidden max-w-40 truncate text-sm text-muted md:inline">{client.businessName || client.name}</span>
            <LanguageToggle />
            <SignOutButton endpoint="/api/portal/auth/logout" redirectTo="/portal/login" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
