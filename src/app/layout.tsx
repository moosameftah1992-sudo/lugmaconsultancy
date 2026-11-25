import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/readex-pro";
import "./globals.css";
import { dirOf } from "@/i18n";
import { LocaleProvider } from "@/i18n/client";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const appUrl = process.env.APP_URL?.trim();
  return {
    metadataBase: appUrl ? new URL(appUrl) : undefined,
    title: {
      default: t("Luqma — Restaurant Solutions & Operations in Bahrain", "لقمة — حلول وتشغيل المطاعم في البحرين"),
      template: "%s · Luqma",
    },
    description: t(
      "Luqma is a Bahrain-based restaurant consultancy: operational audits, pricing in BHD, ordering platforms, POS analytics, content management and government clearance.",
      "وجهتك الاستشارية المتكاملة في البحرين: نعالج تحديات التشغيل، نسعّر القوائم، نبني المنصات، ونروّج لها — بشفافية ومتابعة خطوة بخطوة",
    ),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f4",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body className="min-h-screen antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}