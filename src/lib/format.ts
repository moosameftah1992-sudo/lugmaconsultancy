import type { Locale } from "@/types";

const TIME_ZONE = "Asia/Bahrain";
const dateLocale = (locale: Locale) => (locale === "ar" ? "ar-BH-u-nu-latn-ca-gregory" : "en-GB");

const bhd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Formats a Bahraini Dinar amount with its three fils decimals. */
export function formatBhd(value: string | number | null | undefined, locale: Locale): string {
  const amount = bhd.format(Number(value ?? 0));
  return locale === "ar" ? `${amount} د.ب` : `BHD ${amount}`;
}

export function formatDate(value: Date | string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(d);
}

export function formatDateTime(value: Date | string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(d);
}

export function formatMonth(month: string, locale: Locale, style: "long" | "short" = "long"): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(dateLocale(locale), {
    month: style,
    year: style === "long" ? "numeric" : "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Current month (YYYY-MM) in Bahrain time. */
export function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: TIME_ZONE })
    .format(new Date())
    .slice(0, 7);
}

/** Today's date (YYYY-MM-DD) in Bahrain time. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export const orderRef = (number: number): string => `LQ-${String(number).padStart(5, "0")}`;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Splits a one-item-per-line text field into a clean list. */
export const toLines = (text: string | null | undefined): string[] =>
  (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
