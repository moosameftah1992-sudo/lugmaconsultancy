"use client";

import { Languages, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LOCALE_COOKIE } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";

/** Switches between Arabic (RTL) and English (LTR) and remembers the choice for a year. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      lang={next}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        window.location.reload();
      }}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-50 ${className}`}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
    >
      <Languages className="size-4" aria-hidden="true" />
      {next === "ar" ? "العربية" : "English"}
    </button>
  );
}

/** Ends the session through the API, then leaves the private area. */
export function SignOutButton({ endpoint, redirectTo, className = "" }: { endpoint: string; redirectTo: string; className?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(endpoint, { method: "POST" }).catch(() => null);
        window.location.assign(redirectTo);
      }}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-50 disabled:opacity-60 ${className}`}
    >
      <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      {t("Sign out", "تسجيل الخروج")}
    </button>
  );
}

const TONES = {
  neutral: "bg-navy-50 text-navy-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-navy-100 text-navy-800",
} as const;
export type Tone = keyof typeof TONES;

const STATUS_TONES: Record<string, Tone> = {
  pending: "amber",
  active: "green",
  suspended: "red",
  new: "amber",
  on_hold: "neutral",
  completed: "blue",
  cancelled: "red",
  due: "amber",
  submitted: "blue",
  paid: "green",
  failed: "red",
  handled: "neutral",
  sent: "green",
  not_configured: "amber",
  processed: "green",
  rejected: "red",
  error: "red",
  ignored: "neutral",
  duplicate: "neutral",
};

export function Badge({ tone, status, children }: { tone?: Tone; status?: string; children: ReactNode }) {
  const resolved = tone ?? (status ? STATUS_TONES[status] : undefined) ?? "neutral";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs leading-5 font-medium whitespace-nowrap ${TONES[resolved]}`}>
      {children}
    </span>
  );
}
