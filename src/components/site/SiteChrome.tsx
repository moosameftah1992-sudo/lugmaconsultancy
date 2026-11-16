"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageToggle } from "@/components/ui/misc";
import { useT } from "@/i18n/client";

/** Public header. Deliberately contains no link to, or mention of, the admin area. */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const links: Array<[string, string]> = [
    ["/#services", t("Services", "الخدمات")],
    ["/#work", t("Our work", "أعمالنا")],
    ["/#process", t("How we work", "طريقة عملنا")],
    ["/#contact", t("Contact", "تواصل معنا")],
  ];
  const portalHref = signedIn ? "/portal" : "/portal/login";
  const portalLabel = signedIn ? t("My portal", "بوابتي") : t("Client portal", "بوابة العملاء");

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label={t("Luqma — home", "لقمة — الرئيسية")} className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label={t("Main", "الرئيسية")} className="hidden items-center lg:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full px-4 py-2 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-50">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageToggle className="max-sm:hidden" />
          <Link href={portalHref} className="btn btn-primary btn-sm max-sm:hidden">
            {portalLabel}
          </Link>
          <button
            type="button"
            className="grid size-11 cursor-pointer place-items-center rounded-full text-navy-900 hover:bg-navy-50 lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? t("Close menu", "إغلاق القائمة") : t("Open menu", "فتح القائمة")}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="lq-fade-in border-t border-line bg-paper px-4 pt-2 pb-5 lg:hidden">
          <nav aria-label={t("Main", "الرئيسية")} className="flex flex-col">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center border-b border-line text-base font-medium text-navy-900"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between gap-3">
            <LanguageToggle />
            <Link href={portalHref} onClick={() => setOpen(false)} className="btn btn-primary">
              {portalLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
