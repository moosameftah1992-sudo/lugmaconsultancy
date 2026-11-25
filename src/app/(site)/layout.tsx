import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/parts";
import { SiteHeader } from "@/components/site/SiteChrome";
import { pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getClient } from "@/lib/auth/session";
import { listServices } from "@/lib/data";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const [client, services, site] = await Promise.all([getClient(), listServices(), getSiteSettings()]);
  return (
    <>
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50">
        {locale === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}
      </a>
      <SiteHeader signedIn={Boolean(client)} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale} site={site} services={services.map((s) => ({ slug: s.slug, title: pick(locale, s.titleEn, s.titleAr) }))} />
    </>
  );
}
