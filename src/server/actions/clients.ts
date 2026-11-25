"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, orders } from "@/db/schema";
import { hashPassword, isStrongEnough } from "@/lib/auth/password";
import { revokeSessions } from "@/lib/auth/session";
import { notifyAccountActivated } from "@/lib/notifications";
import { adminAction, flag, FormError, isEmail, oneOf, required, str, uuid } from "@/server/form";
import { CLIENT_STATUSES, type ActionResult } from "@/types";
import type { TFn } from "@/i18n";
import type { EmailStatus } from "@/lib/email";

const weakPassword = (t: TFn) =>
  t("Use at least 8 characters with letters and numbers.", "استخدم 8 أحرف على الأقل تتضمن حروفًا وأرقامًا.");

const emailOutcome = (status: EmailStatus, t: TFn): string =>
  status === "sent"
    ? t("The client was notified by e-mail.", "تم إشعار العميل بالبريد الإلكتروني.")
    : status === "not_configured"
      ? t("No e-mail was sent: SMTP is not configured yet.", "لم يُرسل بريد: لم يتم إعداد SMTP بعد.")
      : t("The notification e-mail failed to send — see the e-mail log in Settings.", "تعذّر إرسال بريد الإشعار — راجع سجل البريد في الإعدادات.");

export async function createClient(fd: FormData): Promise<ActionResult> {
  return adminAction("clients", async (_admin, t) => {
    const email = required(fd, "email", t("Enter the client's e-mail.", "أدخل بريد العميل الإلكتروني."), 200).toLowerCase();
    if (!isEmail(email)) throw new FormError(t("That e-mail address does not look right.", "عنوان البريد الإلكتروني غير صحيح."));
    const password = String(fd.get("password") ?? "");
    if (!isStrongEnough(password)) throw new FormError(weakPassword(t));
    const activate = flag(fd, "activate");

    const [row] = await db
      .insert(clients)
      .values({
        name: required(fd, "name", t("Enter the client's name.", "أدخل اسم العميل."), 120),
        businessName: str(fd, "businessName", 160),
        email,
        phone: str(fd, "phone", 40),
        passwordHash: await hashPassword(password),
        locale: oneOf(fd, "locale", ["en", "ar"] as const, "en"),
        status: activate ? "active" : "pending",
        activatedAt: activate ? new Date() : null,
      })
      .onConflictDoNothing()
      .returning({ id: clients.id });
    if (!row) throw new FormError(t("A client with this e-mail already exists.", "يوجد عميل بهذا البريد الإلكتروني."));

    const note = activate ? ` ${emailOutcome(await notifyAccountActivated(row.id), t)}` : "";
    return { ok: true, message: t("Client account created.", "تم إنشاء حساب العميل.") + note };
  });
}

export async function updateClient(fd: FormData): Promise<ActionResult> {
  return adminAction("clients", async (_admin, t) => {
    await db
      .update(clients)
      .set({
        name: required(fd, "name", t("Enter the client's name.", "أدخل اسم العميل."), 120),
        businessName: str(fd, "businessName", 160),
        phone: str(fd, "phone", 40),
        adminNotes: str(fd, "adminNotes", 2000),
      })
      .where(eq(clients.id, uuid(fd, "id")));
    return { ok: true, message: t("Client saved.", "تم حفظ بيانات العميل.") };
  });
}

/** Activates, suspends or re-activates a client. Activation triggers the welcome e-mail. */
export async function setClientStatus(fd: FormData): Promise<ActionResult> {
  return adminAction("clients", async (_admin, t) => {
    const id = uuid(fd, "id");
    const status = oneOf(fd, "status", CLIENT_STATUSES, "pending");
    const [current] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!current) throw new FormError(t("This client no longer exists.", "هذا العميل لم يعد موجودًا."));
    if (current.status === status) return { ok: true };

    await db
      .update(clients)
      .set({ status, activatedAt: status === "active" ? (current.activatedAt ?? new Date()) : current.activatedAt })
      .where(eq(clients.id, id));

    if (status === "suspended") {
      await revokeSessions("client", id);
      return { ok: true, message: t("Client suspended and signed out everywhere.", "تم إيقاف العميل وتسجيل خروجه من جميع الأجهزة.") };
    }
    if (status === "active") {
      const first = !current.activatedAt;
      const note = first ? ` ${emailOutcome(await notifyAccountActivated(id), t)}` : "";
      return { ok: true, message: t("Client activated.", "تم تفعيل العميل.") + note };
    }
    return { ok: true };
  });
}

export async function resetClientPassword(fd: FormData): Promise<ActionResult> {
  return adminAction("clients", async (_admin, t) => {
    const id = uuid(fd, "id");
    const password = String(fd.get("password") ?? "");
    if (!isStrongEnough(password)) throw new FormError(weakPassword(t));
    await db.update(clients).set({ passwordHash: await hashPassword(password) }).where(eq(clients.id, id));
    await revokeSessions("client", id);
    return { ok: true, message: t("Password reset. Share the new password with the client securely.", "تمت إعادة تعيين كلمة المرور. شارك الكلمة الجديدة مع العميل بطريقة آمنة.") };
  });
}

export async function deleteClient(fd: FormData): Promise<ActionResult> {
  return adminAction("clients", async (_admin, t) => {
    const id = uuid(fd, "id");
    const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.clientId, id));
    if ((count?.n ?? 0) > 0) {
      throw new FormError(
        t("This client has orders on record. Suspend the account instead of deleting it.", "لهذا العميل طلبات مسجّلة. أوقف الحساب بدلًا من حذفه."),
      );
    }
    await revokeSessions("client", id);
    await db.delete(clients).where(eq(clients.id, id));
    return { ok: true, message: t("Client deleted.", "تم حذف العميل.") };
  });
}
