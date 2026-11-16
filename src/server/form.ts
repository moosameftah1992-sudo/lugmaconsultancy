import { getT } from "@/i18n/server";
import type { TFn } from "@/i18n";
import { assertAdmin, assertClient, AuthError } from "@/lib/auth/session";
import { isUuid } from "@/lib/format";
import { UploadError } from "@/lib/media";
import type { ActionResult, AdminUser, ClientUser, Permission } from "@/types";

/** A validation problem that is safe to show to the user as-is. */
export class FormError extends Error {}

export const str = (fd: FormData, key: string, max = 4000): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

export function required(fd: FormData, key: string, message: string, max = 4000): string {
  const v = str(fd, key, max);
  if (!v) throw new FormError(message);
  return v;
}

export const flag = (fd: FormData, key: string): boolean => ["on", "true", "1"].includes(String(fd.get(key) ?? ""));

/** Parses a BHD amount (max three decimals) and returns it normalised, e.g. "150.000". */
export function money(fd: FormData, key: string, message: string): string {
  const raw = str(fd, key, 20).replace(/,/g, "");
  if (!/^\d{1,8}(\.\d{1,3})?$/.test(raw)) throw new FormError(message);
  return Number(raw).toFixed(3);
}

export function optionalMoney(fd: FormData, key: string, message: string): string | null {
  return str(fd, key, 20) ? money(fd, key, message) : null;
}

export function int(fd: FormData, key: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(str(fd, key, 12), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[], fallback: T): T {
  const v = str(fd, key, 60);
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function uuid(fd: FormData, key: string): string {
  const v = str(fd, key, 40);
  if (!isUuid(v)) throw new FormError("Invalid request.");
  return v;
}

export const idList = (fd: FormData, key: string): string[] => str(fd, key, 2000).split(",").filter(isUuid);

export const isEmail = (v: string): boolean => v.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Only http(s) links are stored — blocks javascript: and data: URLs. */
export function httpUrl(value: string, message: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    /* fall through */
  }
  throw new FormError(message);
}

function toResult(error: unknown, t: TFn): ActionResult {
  if (error instanceof FormError || error instanceof UploadError) return { ok: false, error: error.message };
  if (error instanceof AuthError) {
    return {
      ok: false,
      error:
        error.status === 403
          ? t("You do not have permission to do this.", "ليست لديك صلاحية لتنفيذ هذا الإجراء.")
          : t("Your session has expired. Please sign in again.", "انتهت جلستك. يرجى تسجيل الدخول من جديد."),
    };
  }
  console.error("[action] unexpected error", error);
  return { ok: false, error: t("Something went wrong on our side. Please try again.", "حدث خطأ من جهتنا. يرجى المحاولة مرة أخرى.") };
}

/**
 * Wraps every admin mutation: authenticates, checks the permission, runs the
 * handler and converts any failure into a safe, localized message.
 */
export async function adminAction(
  permission: Permission | null,
  fn: (admin: AdminUser, t: TFn) => Promise<ActionResult | void>,
): Promise<ActionResult> {
  const t = await getT();
  try {
    const admin = await assertAdmin(permission);
    return (await fn(admin, t)) ?? { ok: true };
  } catch (error) {
    return toResult(error, t);
  }
}

export async function clientAction(fn: (client: ClientUser, t: TFn) => Promise<ActionResult | void>): Promise<ActionResult> {
  const t = await getT();
  try {
    const client = await assertClient();
    return (await fn(client, t)) ?? { ok: true };
  } catch (error) {
    return toResult(error, t);
  }
}
