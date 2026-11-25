import type { Bi, Locale } from "@/types";

export const LOCALE_COOKIE = "luqma_locale";

/** Translator: pass the English and Arabic strings side by side, get the active one back. */
export type TFn = (en: string, ar: string) => string;

export const makeT =
  (locale: Locale): TFn =>
  (en, ar) =>
    locale === "ar" ? ar : en;

export const dirOf = (locale: Locale): "rtl" | "ltr" => (locale === "ar" ? "rtl" : "ltr");

/** Picks the localized value of bilingual database content, falling back to the other language. */
export function pick(locale: Locale, en: string | null | undefined, ar: string | null | undefined): string {
  const primary = locale === "ar" ? ar : en;
  const secondary = locale === "ar" ? en : ar;
  return primary && primary.trim() ? primary : (secondary ?? "");
}

export const bi = (t: TFn, pair: Bi): string => t(pair[0], pair[1]);
