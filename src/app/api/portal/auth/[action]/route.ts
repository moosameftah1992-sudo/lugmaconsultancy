import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import type { TFn } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { hashPassword, isStrongEnough, verifyPassword } from "@/lib/auth/password";
import {
  clearAttempts,
  clientIp,
  createSession,
  destroySession,
  isSameOrigin,
  recordFailedAttempt,
  tooManyAttempts,
} from "@/lib/auth/session";
import { notifyTeam } from "@/lib/email";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown> | null;
const field = (body: Body, key: string, max: number) => String(body?.[key] ?? "").trim().slice(0, max);
const fail = (error: string, status: number) => Response.json({ error }, { status });
const throttled = (t: TFn) =>
  fail(t("Too many attempts. Please wait 15 minutes and try again.", "محاولات كثيرة. يرجى الانتظار 15 دقيقة ثم المحاولة مجددًا."), 429);

async function login(body: Body, t: TFn) {
  const email = field(body, "email", 200).toLowerCase();
  const password = String(body?.password ?? "").slice(0, 200);
  if (!email || !password) return fail(t("Enter your e-mail and password.", "أدخل بريدك الإلكتروني وكلمة المرور."), 400);

  const key = `client:${email}:${await clientIp()}`;
  if (await tooManyAttempts(key)) return throttled(t);

  const [row] = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
  const valid = await verifyPassword(password, row?.passwordHash);
  if (!row || !valid) {
    await recordFailedAttempt(key);
    return fail(t("Incorrect e-mail or password.", "البريد الإلكتروني أو كلمة المرور غير صحيحة."), 401);
  }
  if (row.status === "suspended") {
    return fail(t("This account is suspended. Please contact Luqma.", "هذا الحساب موقوف. يرجى التواصل مع لقمة."), 403);
  }
  await clearAttempts(key);
  await createSession("client", row.id);
  return Response.json({ ok: true });
}

async function register(body: Body, t: TFn) {
  // Honeypot: real visitors never fill this hidden field.
  if (field(body, "website", 100)) return Response.json({ ok: true });

  const name = field(body, "name", 120);
  const email = field(body, "email", 200).toLowerCase();
  const password = String(body?.password ?? "").slice(0, 200);
  if (name.length < 2) return fail(t("Enter your full name.", "أدخل اسمك الكامل."), 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(t("That e-mail address does not look right.", "عنوان البريد الإلكتروني غير صحيح."), 400);
  if (!isStrongEnough(password)) {
    return fail(t("Use at least 8 characters with letters and numbers.", "استخدم 8 أحرف على الأقل تتضمن حروفًا وأرقامًا."), 400);
  }

  const key = `register:${await clientIp()}`;
  if (await tooManyAttempts(key)) return throttled(t);
  await recordFailedAttempt(key);

  const [row] = await db
    .insert(clients)
    .values({
      name,
      email,
      businessName: field(body, "businessName", 160),
      phone: field(body, "phone", 40),
      passwordHash: await hashPassword(password),
      locale: await getLocale(),
    })
    .onConflictDoNothing()
    .returning({ id: clients.id });
  if (!row) return fail(t("An account with this e-mail already exists. Sign in instead.", "يوجد حساب بهذا البريد الإلكتروني. سجّل الدخول بدلًا من ذلك."), 409);

  await createSession("client", row.id);
  await notifyTeam("New client registration awaiting activation", [`${name} — ${email}`], `${await getBaseUrl()}/admin/clients`);
  return Response.json({ ok: true });
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const t = await getT();
  try {
    if (!isSameOrigin(req)) return fail("Forbidden", 403);
    const { action } = await ctx.params;
    if (action === "logout") {
      await destroySession("client");
      return Response.json({ ok: true });
    }
    const body = (await req.json().catch(() => null)) as Body;
    if (action === "login") return await login(body, t);
    if (action === "register") return await register(body, t);
    return fail("Not found", 404);
  } catch (error) {
    console.error("[portal auth]", error);
    return fail(t("Something went wrong on our side. Please try again.", "حدث خطأ من جهتنا. يرجى المحاولة مرة أخرى."), 500);
  }
}
