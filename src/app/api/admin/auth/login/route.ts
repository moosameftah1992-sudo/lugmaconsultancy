import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureBootstrap } from "@/db/bootstrap";
import { admins } from "@/db/schema";
import { getT } from "@/i18n/server";
import { verifyPassword } from "@/lib/auth/password";
import { clearAttempts, clientIp, createSession, isSameOrigin, recordFailedAttempt, tooManyAttempts } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const t = await getT();
  try {
    if (!isSameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const body = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
    const username = String(body?.username ?? "").trim().slice(0, 60);
    const password = String(body?.password ?? "").slice(0, 200);
    if (!username || !password) {
      return Response.json({ error: t("Enter your username and password.", "أدخل اسم المستخدم وكلمة المرور.") }, { status: 400 });
    }

    await ensureBootstrap();
    const key = `admin:${username.toLowerCase()}:${await clientIp()}`;
    if (await tooManyAttempts(key)) {
      return Response.json(
        { error: t("Too many attempts. Please wait 15 minutes and try again.", "محاولات كثيرة. يرجى الانتظار 15 دقيقة ثم المحاولة مجددًا.") },
        { status: 429 },
      );
    }

    const [row] = await db.select().from(admins).where(eq(admins.usernameKey, username.toLowerCase())).limit(1);
    const valid = await verifyPassword(password, row?.passwordHash);
    if (!row || !valid || !row.isActive) {
      await recordFailedAttempt(key);
      return Response.json({ error: t("Incorrect username or password.", "اسم المستخدم أو كلمة المرور غير صحيحة.") }, { status: 401 });
    }

    await clearAttempts(key);
    await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, row.id));
    await createSession("admin", row.id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[admin login]", error);
    return Response.json({ error: t("Sign-in is unavailable right now. Please try again.", "تسجيل الدخول غير متاح حاليًا. يرجى المحاولة مجددًا.") }, { status: 500 });
  }
}
