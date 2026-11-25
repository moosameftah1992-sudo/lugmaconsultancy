import { pushToOpsHub } from "@/lib/ops-bridge";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import { clientIp, isSameOrigin, recordFailedAttempt, tooManyAttempts } from "@/lib/auth/session";
import { notifyTeam } from "@/lib/email";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Public "book a consultation" form. */
export async function POST(req: Request) {
  const t = await getT();
  try {
    if (!isSameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const field = (key: string, max: number) => String(body?.[key] ?? "").trim().slice(0, max);

    // Honeypot: bots fill every field; people never see this one.
    if (field("website", 100)) return Response.json({ ok: true });

    const name = field("name", 120);
    const email = field("email", 200).toLowerCase();
    const message = field("message", 3000);
    if (name.length < 2) return Response.json({ error: t("Please tell us your name.", "يرجى إدخال اسمك.") }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return Response.json({ error: t("That e-mail address does not look right.", "عنوان البريد الإلكتروني غير صحيح.") }, { status: 400 });
    }
    if (message.length < 10) {
      return Response.json({ error: t("Tell us a little about what you need (at least 10 characters).", "أخبرنا قليلًا عمّا تحتاجه (10 أحرف على الأقل).") }, { status: 400 });
    }

    const key = `inquiry:${await clientIp()}`;
    if (await tooManyAttempts(key)) {
      return Response.json({ error: t("You have sent several messages already. Please try again later.", "أرسلت عدة رسائل بالفعل. يرجى المحاولة لاحقًا.") }, { status: 429 });
    }
    await recordFailedAttempt(key);

    await db.insert(inquiries).values({
      name,
      email,
      message,
      phone: field("phone", 40),
      business: field("business", 160),
      serviceSlug: field("service", 60) || null,
      locale: await getLocale(),
    });
    await pushToOpsHub({
      businessName: field("business", 160) || name,
      contactName: name,
      phone: field("phone", 40),
      email,
      pillarSlug: field("service", 60) || undefined,
      notes: message,
    });
    await notifyTeam(`New inquiry from ${name}`, [`${email} ${field("phone", 40)}`.trim(), message], `${await getBaseUrl()}/admin/inquiries`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[inquiries]", error);
    return Response.json({ error: t("We could not send your message. Please try again.", "تعذّر إرسال رسالتك. يرجى المحاولة مجددًا.") }, { status: 500 });
  }
}
