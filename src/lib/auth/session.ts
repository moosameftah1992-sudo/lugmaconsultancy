import { createHash, randomBytes } from "crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { admins, clients, loginAttempts, sessions } from "@/db/schema";
import { PERMISSIONS, type AdminUser, type ClientStatus, type ClientUser, type Locale, type Permission } from "@/types";

type SessionType = "admin" | "client";

const CONFIG = {
  admin: { cookie: "luqma_admin", ttlSeconds: 60 * 60 * 12 },
  client: { cookie: "luqma_client", ttlSeconds: 60 * 60 * 24 * 14 },
} as const;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function cookieOptions(maxAge: number) {
  const proto = ((await headers()).get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const configured = process.env.COOKIE_SAMESITE;
  const sameSite: "lax" | "strict" | "none" = configured === "none" || configured === "strict" ? configured : "lax";
  return {
    httpOnly: true,
    sameSite,
    secure: proto === "https" || sameSite === "none" || process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge,
  };
}

/** Creates a server-side session and sets the opaque token as an httpOnly cookie. */
export async function createSession(type: SessionType, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const { cookie, ttlSeconds } = CONFIG[type];
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userType: type,
    userId,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  (await cookies()).set(cookie, token, await cookieOptions(ttlSeconds));
}

export async function destroySession(type: SessionType): Promise<void> {
  const store = await cookies();
  const token = store.get(CONFIG[type].cookie)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  store.delete(CONFIG[type].cookie);
}

/** Ends every session of a user (used when an account is suspended, deleted or its password changes). */
export async function revokeSessions(type: SessionType, userId: string): Promise<void> {
  await db.delete(sessions).where(and(eq(sessions.userType, type), eq(sessions.userId, userId)));
}

async function readSession(type: SessionType): Promise<string | null> {
  const token = (await cookies()).get(CONFIG[type].cookie)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashToken(token)), eq(sessions.userType, type), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.userId ?? null;
}

/* ─────────────────────────────────── Admins ────────────────────────────────── */

export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const userId = await readSession("admin");
  if (!userId) return null;
  const [row] = await db
    .select()
    .from(admins)
    .where(and(eq(admins.id, userId), eq(admins.isActive, true)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    isMaster: row.isMaster,
    permissions: row.isMaster ? [...PERMISSIONS] : row.permissions.filter((p) => PERMISSIONS.includes(p)),
  };
});

export const can = (admin: AdminUser, permission: Permission): boolean =>
  admin.isMaster || admin.permissions.includes(permission);

/** Page guard: unauthenticated visitors are sent to the /admin sign-in screen. */
export async function requireAdmin(permission?: Permission): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");
  if (permission && !can(admin, permission)) redirect("/admin/overview?denied=1");
  return admin;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403 = 401,
  ) {
    super(message);
  }
}

/** Action / API guard: throws instead of redirecting. */
export async function assertAdmin(permission: Permission | null): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new AuthError("Your session has expired. Please sign in again.", 401);
  if (permission && !can(admin, permission)) throw new AuthError("You do not have permission to do this.", 403);
  return admin;
}

/* ─────────────────────────────────── Clients ───────────────────────────────── */

export const getClient = cache(async (): Promise<ClientUser | null> => {
  const userId = await readSession("client");
  if (!userId) return null;
  const [row] = await db.select().from(clients).where(eq(clients.id, userId)).limit(1);
  if (!row || row.status === "suspended") return null;
  return {
    id: row.id,
    name: row.name,
    businessName: row.businessName,
    email: row.email,
    phone: row.phone,
    status: row.status as ClientStatus,
    locale: (row.locale === "ar" ? "ar" : "en") as Locale,
  };
});

export async function requireClient(next?: string): Promise<ClientUser> {
  const client = await getClient();
  if (!client) redirect(next ? `/portal/login?next=${encodeURIComponent(next)}` : "/portal/login");
  return client;
}

export async function assertClient(): Promise<ClientUser> {
  const client = await getClient();
  if (!client) throw new AuthError("Your session has expired. Please sign in again.", 401);
  return client;
}

/* ─────────────────────────── Brute-force protection ────────────────────────── */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export async function tooManyAttempts(key: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.key, key), gt(loginAttempts.createdAt, new Date(Date.now() - WINDOW_MS))));
  return (row?.n ?? 0) >= MAX_FAILURES;
}

export async function recordFailedAttempt(key: string): Promise<void> {
  await db.insert(loginAttempts).values({ key });
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
}

export async function clearAttempts(key: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}

/**
 * CSRF guard for cookie-authenticated route handlers.
 * Browsers attach Sec-Fetch-Site, which page scripts cannot forge and which stays
 * correct behind any reverse proxy. Older clients fall back to comparing Origin with
 * the request host (or APP_URL).
 */
export function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";

  const origin = req.headers.get("origin");
  if (!origin) return true; // not a browser request — carries no ambient cookies to abuse
  try {
    const originHost = new URL(origin).host;
    const hosts = [req.headers.get("x-forwarded-host"), req.headers.get("host")]
      .flatMap((h) => (h ?? "").split(","))
      .map((h) => h.trim())
      .filter(Boolean);
    const appUrl = process.env.APP_URL?.trim();
    if (appUrl) hosts.push(new URL(appUrl).host);
    return hosts.includes(originHost);
  } catch {
    return false;
  }
}
