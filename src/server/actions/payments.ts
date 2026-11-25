"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentMethods, payments } from "@/db/schema";
import type { TFn } from "@/i18n";
import { claimMedia, deleteMedia } from "@/lib/media";
import { isGatewayKey, missingEnv } from "@/lib/payments/gateways";
import { processGatewayEvent, settlePayment, simulatedEvent } from "@/lib/payments/process";
import { adminAction, flag, FormError, idList, money, oneOf, required, str, uuid } from "@/server/form";
import type { ActionResult } from "@/types";

interface EnableCheck {
  key: string;
  type: string;
  mode: string;
  qrFileId: string | null;
  iban: string;
}

/** A channel may only go live on checkout when it can actually take a payment. */
function assertCanEnable(m: EnableCheck, t: TFn): void {
  if (m.key === "benefit_qr" && !m.qrFileId) {
    throw new FormError(t("Upload your BenefitPay QR code before enabling this method.", "ارفع رمز QR الخاص ببنفت بي قبل تفعيل هذه الوسيلة."));
  }
  if (m.key === "bank_transfer" && !m.iban) {
    throw new FormError(t("Enter the IBAN before enabling bank transfer.", "أدخل رقم الآيبان قبل تفعيل التحويل البنكي."));
  }
  if (m.type === "gateway" && m.mode === "live" && isGatewayKey(m.key)) {
    const missing = missingEnv(m.key);
    if (missing.length) {
      throw new FormError(
        t(
          `Live mode needs these environment variables on the server: ${missing.join(", ")}.`,
          `يتطلب الوضع الحي ضبط متغيرات البيئة التالية على الخادم: ${missing.join(", ")}.`,
        ),
      );
    }
  }
}

/** Instant on/off switch. Disabled channels vanish from checkout on the next request. */
export async function togglePaymentMethod(fd: FormData): Promise<ActionResult> {
  return adminAction("payments", async (_admin, t) => {
    const key = str(fd, "key", 30);
    const enable = flag(fd, "enabled");
    const [m] = await db.select().from(paymentMethods).where(eq(paymentMethods.key, key)).limit(1);
    if (!m) throw new FormError(t("Unknown payment method.", "وسيلة دفع غير معروفة."));
    if (enable) assertCanEnable({ key: m.key, type: m.type, mode: m.mode, qrFileId: m.qrFileId, iban: m.config.iban ?? "" }, t);
    await db.update(paymentMethods).set({ isEnabled: enable, updatedAt: new Date() }).where(eq(paymentMethods.key, key));
    return {
      ok: true,
      message: enable
        ? t("Enabled — now visible on customer checkout.", "تم التفعيل — تظهر الآن في صفحة الدفع للعملاء.")
        : t("Disabled — removed from customer checkout.", "تم التعطيل — أُزيلت من صفحة الدفع للعملاء."),
    };
  });
}

export async function savePaymentMethod(fd: FormData): Promise<ActionResult> {
  return adminAction("payments", async (_admin, t) => {
    const key = str(fd, "key", 30);
    const [m] = await db.select().from(paymentMethods).where(eq(paymentMethods.key, key)).limit(1);
    if (!m) throw new FormError(t("Unknown payment method.", "وسيلة دفع غير معروفة."));

    const nameMsg = t("The method needs a name in both languages.", "يجب إدخال اسم الوسيلة باللغتين.");
    const mode = m.type === "gateway" ? oneOf(fd, "mode", ["mock", "live"] as const, "mock") : m.mode;
    const config =
      key === "bank_transfer"
        ? {
            bankName: str(fd, "bankName", 120),
            accountName: str(fd, "accountName", 160),
            iban: str(fd, "iban", 40).replace(/\s+/g, "").toUpperCase(),
            swift: str(fd, "swift", 20).toUpperCase(),
          }
        : m.config;

    let qrFileId = m.qrFileId;
    if (key === "benefit_qr") {
      const [qr] = await claimMedia(idList(fd, "qrIds"), ["qr"]);
      if (qr) qrFileId = qr.id;
      else if (flag(fd, "removeQr")) qrFileId = null;
    }

    if (m.isEnabled) assertCanEnable({ key, type: m.type, mode, qrFileId, iban: config.iban ?? "" }, t);

    await db
      .update(paymentMethods)
      .set({
        nameEn: required(fd, "nameEn", nameMsg, 120),
        nameAr: required(fd, "nameAr", nameMsg, 120),
        instructionsEn: str(fd, "instructionsEn", 1000),
        instructionsAr: str(fd, "instructionsAr", 1000),
        mode,
        config,
        qrFileId,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.key, key));
    if (m.qrFileId && m.qrFileId !== qrFileId) await deleteMedia([m.qrFileId]);
    return { ok: true, message: t("Payment method saved.", "تم حفظ وسيلة الدفع.") };
  });
}

/** Runs a synthetic gateway event through the real webhook pipeline (never touches finance figures). */
export async function simulateWebhook(fd: FormData): Promise<ActionResult> {
  return adminAction("payments", async (_admin, t) => {
    const provider = str(fd, "provider", 30);
    if (!isGatewayKey(provider)) throw new FormError(t("Unknown gateway.", "بوابة غير معروفة."));
    const paymentId = str(fd, "paymentId", 40);
    const outcome = oneOf(fd, "outcome", ["paid", "failed"] as const, "paid");
    if (!paymentId) throw new FormError(t("Choose an open invoice to test with.", "اختر فاتورة مفتوحة للاختبار."));
    const result = await processGatewayEvent({ provider, event: simulatedEvent(uuid(fd, "paymentId"), outcome), simulated: true });
    return { ok: true, message: `${t("Test event", "حدث تجريبي")}: ${result.status} — ${result.message}` };
  });
}

/* ───────────────────────── Invoices on orders (orders permission) ──────────── */

export async function createInvoice(fd: FormData): Promise<ActionResult> {
  return adminAction("orders", async (_admin, t) => {
    const [order] = await db.select().from(orders).where(eq(orders.id, uuid(fd, "orderId"))).limit(1);
    if (!order) throw new FormError(t("This order no longer exists.", "هذا الطلب لم يعد موجودًا."));
    await db.insert(payments).values({
      orderId: order.id,
      clientId: order.clientId,
      label: required(fd, "label", t("Describe what this invoice is for.", "اكتب وصفًا لهذه الفاتورة."), 160),
      amountBhd: money(fd, "amountBhd", t("Enter the amount in BHD, e.g. 250 or 249.500.", "أدخل المبلغ بالدينار البحريني، مثل 250 أو 249.500.")),
    });
    return { ok: true, message: t("Invoice issued — the client can now pay it from the portal.", "تم إصدار الفاتورة — يمكن للعميل دفعها الآن من البوابة.") };
  });
}

/** Confirms, rejects or cancels an invoice. */
export async function reviewPayment(fd: FormData): Promise<ActionResult> {
  return adminAction("orders", async (_admin, t) => {
    const id = uuid(fd, "id");
    const decision = oneOf(fd, "decision", ["confirm", "reject", "cancel"] as const, "confirm");
    const note = str(fd, "note", 300) || null;

    if (decision === "confirm") {
      const method = str(fd, "methodKey", 30);
      const settled = await settlePayment(id, { note, ...(method ? { methodKey: method } : {}) });
      if (!settled) throw new FormError(t("This invoice is already settled or cancelled.", "هذه الفاتورة مسدَّدة أو ملغاة بالفعل."));
      return { ok: true, message: t("Payment confirmed.", "تم تأكيد الدفعة.") };
    }
    if (decision === "reject") {
      await db
        .update(payments)
        .set({ status: "due", note, clientReference: null })
        .where(and(eq(payments.id, id), eq(payments.status, "submitted")));
      return { ok: true, message: t("Marked as not received — the client can pay again.", "تم تسجيلها كغير مستلمة — يمكن للعميل الدفع مجددًا.") };
    }
    await db
      .update(payments)
      .set({ status: "cancelled", note })
      .where(and(eq(payments.id, id), ne(payments.status, "paid"), inArray(payments.status, ["due", "submitted", "failed"])));
    return { ok: true, message: t("Invoice cancelled.", "تم إلغاء الفاتورة.") };
  });
}
