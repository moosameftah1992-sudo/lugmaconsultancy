"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins, financeEntries, inquiries, settings } from "@/db/schema";
import { hashPassword, isStrongEnough, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeSessions } from "@/lib/auth/session";
import type { SiteSettings } from "@/lib/site";
import { adminAction, flag, FormError, isEmail, money, oneOf, required, str, uuid } from "@/server/form";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PERMISSIONS, type ActionResult, type Permission } from "@/types";
import type { TFn } from "@/i18n";

const weakPassword = (t: TFn) =>
  t("Use at least 8 characters with letters and numbers.", "استخدم 8 أحرف على الأقل تتضمن حروفًا وأرقامًا.");
const masterProtected = (t: TFn) =>
  t("The master admin account is protected and cannot be changed or removed.", "حساب المشرف الرئيسي محمي ولا يمكن تعديله أو حذفه.");

/* ─────────────────────────────────── Finance ───────────────────────────────── */

export async function addFinanceEntry(fd: FormData): Promise<ActionResult> {
  return adminAction("finance", async (admin, t) => {
    const kind = oneOf(fd, "kind", ["expense", "income"] as const, "expense");
    const entryDate = str(fd, "entryDate", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || Number.isNaN(Date.parse(entryDate))) {
      throw new FormError(t("Choose the date of this entry.", "اختر تاريخ هذا القيد."));
    }
    await db.insert(financeEntries).values({
      entryDate,
      kind,
      category: kind === "income" ? oneOf(fd, "incomeCategory", INCOME_CATEGORIES, "other") : oneOf(fd, "category", EXPENSE_CATEGORIES, "other"),
      costType: kind === "expense" ? oneOf(fd, "costType", ["fixed", "variable"] as const, "fixed") : null,
      description: str(fd, "description", 300),
      amountBhd: money(fd, "amountBhd", t("Enter the amount in BHD, e.g. 250 or 249.500.", "أدخل المبلغ بالدينار البحريني، مثل 250 أو 249.500.")),
      createdByName: admin.name,
    });
    return { ok: true, message: t("Entry recorded.", "تم تسجيل القيد.") };
  });
}

export async function deleteFinanceEntry(fd: FormData): Promise<ActionResult> {
  return adminAction("finance", async () => {
    await db.delete(financeEntries).where(eq(financeEntries.id, uuid(fd, "id")));
  });
}

/* ────────────────────────────────── Inquiries ──────────────────────────────── */

export async function setInquiryStatus(fd: FormData): Promise<ActionResult> {
  return adminAction("inquiries", async () => {
    await db
      .update(inquiries)
      .set({ status: oneOf(fd, "status", ["new", "handled"] as const, "handled") })
      .where(eq(inquiries.id, uuid(fd, "id")));
  });
}

export async function deleteInquiry(fd: FormData): Promise<ActionResult> {
  return adminAction("inquiries", async () => {
    await db.delete(inquiries).where(eq(inquiries.id, uuid(fd, "id")));
  });
}

/* ───────────────────────────────── Site settings ───────────────────────────── */

export async function saveSiteSettings(fd: FormData): Promise<ActionResult> {
  return adminAction("settings", async (_admin, t) => {
    const email = str(fd, "email", 200);
    if (email && !isEmail(email)) throw new FormError(t("That e-mail address does not look right.", "عنوان البريد الإلكتروني غير صحيح."));
    const value: SiteSettings = {
      email,
      phone: str(fd, "phone", 40),
      whatsapp: str(fd, "whatsapp", 40).replace(/[^\d+]/g, ""),
      instagram: str(fd, "instagram", 60).replace(/^@/, "").replace(/[^\w.]/g, ""),
      addressEn: str(fd, "addressEn", 200),
      addressAr: str(fd, "addressAr", 200),
    };
    await db
      .insert(settings)
      .values({ key: "site", value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    return { ok: true, message: t("Contact details saved — the public site is updated.", "تم حفظ بيانات التواصل — تم تحديث الموقع العام.") };
  });
}

/* ──────────────────────────────── Admin accounts ───────────────────────────── */

function readPermissions(fd: FormData, grantorIsMaster: boolean): Permission[] {
  const chosen = fd.getAll("permissions").map(String);
  // Only the master admin may hand out the right to manage admin accounts.
  return PERMISSIONS.filter((p) => chosen.includes(p) && (p !== "admins" || grantorIsMaster));
}

export async function createAdmin(fd: FormData): Promise<ActionResult> {
  return adminAction("admins", async (admin, t) => {
    const username = required(fd, "username", t("Choose a username.", "اختر اسم مستخدم."), 40);
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
      throw new FormError(t("Usernames use 3–40 letters, numbers, dots, dashes or underscores.", "اسم المستخدم من 3 إلى 40 حرفًا أو رقمًا أو نقطة أو شرطة."));
    }
    const password = String(fd.get("password") ?? "");
    if (!isStrongEnough(password)) throw new FormError(weakPassword(t));
    const email = str(fd, "email", 200);
    if (email && !isEmail(email)) throw new FormError(t("That e-mail address does not look right.", "عنوان البريد الإلكتروني غير صحيح."));

    const [row] = await db
      .insert(admins)
      .values({
        username,
        usernameKey: username.toLowerCase(),
        name: required(fd, "name", t("Enter the person's name.", "أدخل اسم الشخص."), 120),
        email: email || null,
        passwordHash: await hashPassword(password),
        permissions: readPermissions(fd, admin.isMaster),
      })
      .onConflictDoNothing()
      .returning({ id: admins.id });
    if (!row) throw new FormError(t("That username is already taken.", "اسم المستخدم مستخدم بالفعل."));
    return { ok: true, message: t("Admin account created.", "تم إنشاء حساب المشرف.") };
  });
}

export async function updateAdmin(fd: FormData): Promise<ActionResult> {
  return adminAction("admins", async (admin, t) => {
    const id = uuid(fd, "id");
    const [target] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    if (!target) throw new FormError(t("This account no longer exists.", "هذا الحساب لم يعد موجودًا."));
    if (target.isMaster) throw new FormError(masterProtected(t));
    if (target.id === admin.id) {
      throw new FormError(t("You cannot change your own permissions. Ask the master admin.", "لا يمكنك تعديل صلاحياتك بنفسك. اطلب ذلك من المشرف الرئيسي."));
    }

    const password = String(fd.get("password") ?? "");
    if (password && !isStrongEnough(password)) throw new FormError(weakPassword(t));
    const isActive = flag(fd, "isActive");
    // A non-master editor cannot add or remove the "admins" permission of someone else.
    const keepAdmins = !admin.isMaster && target.permissions.includes("admins");
    const permissions = readPermissions(fd, admin.isMaster);
    if (keepAdmins && !permissions.includes("admins")) permissions.push("admins");

    await db
      .update(admins)
      .set({
        name: required(fd, "name", t("Enter the person's name.", "أدخل اسم الشخص."), 120),
        email: str(fd, "email", 200) || null,
        permissions,
        isActive,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      })
      .where(eq(admins.id, id));
    if (!isActive || password) await revokeSessions("admin", id);
    return { ok: true, message: t("Admin account updated.", "تم تحديث حساب المشرف.") };
  });
}

export async function deleteAdmin(fd: FormData): Promise<ActionResult> {
  return adminAction("admins", async (admin, t) => {
    const id = uuid(fd, "id");
    const [target] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    if (!target) return { ok: true };
    if (target.isMaster) throw new FormError(masterProtected(t));
    if (target.id === admin.id) throw new FormError(t("You cannot delete your own account.", "لا يمكنك حذف حسابك."));
    await revokeSessions("admin", id);
    await db.delete(admins).where(eq(admins.id, id));
    return { ok: true, message: t("Admin account deleted.", "تم حذف حساب المشرف.") };
  });
}

/** Any admin (including the master) can change their own password after confirming the current one. */
export async function changeOwnPassword(fd: FormData): Promise<ActionResult> {
  return adminAction(null, async (admin, t) => {
    const [row] = await db.select().from(admins).where(eq(admins.id, admin.id)).limit(1);
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    if (!row || !(await verifyPassword(current, row.passwordHash))) {
      throw new FormError(t("Your current password is not correct.", "كلمة المرور الحالية غير صحيحة."));
    }
    if (!isStrongEnough(next)) throw new FormError(weakPassword(t));
    if (next !== String(fd.get("confirm") ?? "")) throw new FormError(t("The new passwords do not match.", "كلمتا المرور الجديدتان غير متطابقتين."));
    await db.update(admins).set({ passwordHash: await hashPassword(next) }).where(eq(admins.id, admin.id));
    await revokeSessions("admin", admin.id);
    await createSession("admin", admin.id);
    return { ok: true, message: t("Password changed. Other devices were signed out.", "تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى.") };
  });
}
