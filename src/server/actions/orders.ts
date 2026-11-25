"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, mediaFiles, orders, packages, payments, reportAttachments, reports, services } from "@/db/schema";
import type { TFn } from "@/i18n";
import type { EmailStatus } from "@/lib/email";
import { claimMedia } from "@/lib/media";
import { notifyReportPublished } from "@/lib/notifications";
import { adminAction, flag, FormError, httpUrl, idList, int, oneOf, optionalMoney, required, str, uuid } from "@/server/form";
import { BILLING_CYCLES, ORDER_STATUSES, REPORT_TYPES, type ActionResult } from "@/types";

const publishedMessage = (status: EmailStatus | "skipped", t: TFn): string => {
  const base = t("Published to the client portal.", "تم النشر في بوابة العميل.");
  if (status === "sent") return `${base} ${t("The client was notified by e-mail.", "تم إشعار العميل بالبريد الإلكتروني.")}`;
  if (status === "not_configured") return `${base} ${t("No e-mail was sent: SMTP is not configured yet.", "لم يُرسل بريد: لم يتم إعداد SMTP بعد.")}`;
  if (status === "failed") return `${base} ${t("The notification e-mail failed to send — see the e-mail log in Settings.", "تعذّر إرسال بريد الإشعار — راجع سجل البريد في الإعدادات.")}`;
  return base;
};

export async function updateOrder(fd: FormData): Promise<ActionResult> {
  return adminAction("orders", async (_admin, t) => {
    const amountMsg = t("Enter the amount in BHD, e.g. 250 or 249.500.", "أدخل المبلغ بالدينار البحريني، مثل 250 أو 249.500.");
    await db
      .update(orders)
      .set({
        status: oneOf(fd, "status", ORDER_STATUSES, "new"),
        progress: int(fd, "progress", 0, 100, 0),
        amountBhd: optionalMoney(fd, "amountBhd", amountMsg),
        billingCycle: oneOf(fd, "billingCycle", BILLING_CYCLES, "one_time"),
        adminNotes: str(fd, "adminNotes", 2000),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, uuid(fd, "id")));
    return { ok: true, message: t("Order updated.", "تم تحديث الطلب.") };
  });
}

/** Lets the team open an order / retainer on behalf of a client (e.g. agreed offline). */
export async function createOrderForClient(fd: FormData): Promise<ActionResult> {
  return adminAction("orders", async (_admin, t) => {
    const [client] = await db.select().from(clients).where(eq(clients.id, uuid(fd, "clientId"))).limit(1);
    if (!client) throw new FormError(t("Choose a client.", "اختر عميلًا."));
    // A chosen package decides the service; otherwise the service is picked directly.
    const packageId = str(fd, "packageId", 40);
    const [pkg] = packageId ? await db.select().from(packages).where(eq(packages.id, uuid(fd, "packageId"))).limit(1) : [];
    if (!pkg && !str(fd, "serviceId", 40)) throw new FormError(t("Choose a service or a package.", "اختر خدمة أو باقة."));
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, pkg ? pkg.serviceId : uuid(fd, "serviceId")))
      .limit(1);
    if (!service) throw new FormError(t("Choose a service.", "اختر خدمة."));
    const amountMsg = t("Enter the amount in BHD, e.g. 250 or 249.500.", "أدخل المبلغ بالدينار البحريني، مثل 250 أو 249.500.");
    const amount = optionalMoney(fd, "amountBhd", amountMsg) ?? pkg?.priceBhd ?? null;
    const billingCycle = pkg ? pkg.billingCycle : oneOf(fd, "billingCycle", BILLING_CYCLES, "one_time");

    const [order] = await db
      .insert(orders)
      .values({
        clientId: client.id,
        serviceId: service.id,
        packageId: pkg?.id ?? null,
        packageName: pkg ? pkg.nameEn || pkg.nameAr : str(fd, "packageName", 120),
        amountBhd: amount,
        billingCycle,
        status: "active",
      })
      .returning({ id: orders.id });

    if (flag(fd, "invoice") && amount && Number(amount) > 0) {
      await db.insert(payments).values({
        orderId: order.id,
        clientId: client.id,
        label: pkg ? pkg.nameEn || pkg.nameAr : service.titleEn,
        amountBhd: amount,
      });
    }
    return { ok: true, redirect: `/admin/orders/${order.id}` };
  });
}

/**
 * Creates an update / report / deliverable on an order. Publishing makes it visible in
 * the client's portal and triggers the notification e-mail.
 */
export async function saveReport(fd: FormData): Promise<ActionResult> {
  return adminAction("orders", async (admin, t) => {
    const [order] = await db.select().from(orders).where(eq(orders.id, uuid(fd, "orderId"))).limit(1);
    if (!order) throw new FormError(t("This order no longer exists.", "هذا الطلب لم يعد موجودًا."));

    const title = required(fd, "title", t("Give the update a title.", "أدخل عنوانًا للتحديث."), 200);
    const linkUrl = httpUrl(str(fd, "linkUrl", 600), t("The link must start with https://", "يجب أن يبدأ الرابط بـ https://"));
    const progressRaw = str(fd, "progress", 4);
    const progress = progressRaw ? int(fd, "progress", 0, 100, order.progress) : null;
    const publish = flag(fd, "publish");

    const [report] = await db
      .insert(reports)
      .values({
        orderId: order.id,
        clientId: order.clientId,
        type: oneOf(fd, "type", REPORT_TYPES, "update"),
        title,
        body: str(fd, "body", 8000),
        linkUrl,
        progress,
        publishedAt: publish ? new Date() : null,
        createdByName: admin.name,
      })
      .returning({ id: reports.id });

    const files = await claimMedia(idList(fd, "filesIds"), ["report"]);
    if (files.length) {
      await db.insert(reportAttachments).values(files.map((f) => ({ reportId: report.id, fileId: f.id, filename: f.filename })));
    }

    if (!publish) return { ok: true, message: t("Saved as a draft — the client cannot see it yet.", "حُفظ كمسودة — لا يراه العميل بعد.") };
    return { ok: true, message: publishedMessage(await publishEffects(report.id, order.id, progress, flag(fd, "notify")), t) };
  });
}

async function publishEffects(reportId: string, orderId: string, progress: number | null, notify: boolean) {
  await db
    .update(orders)
    .set({ updatedAt: new Date(), ...(progress !== null ? { progress } : {}) })
    .where(eq(orders.id, orderId));
  const status: EmailStatus | "skipped" = notify ? await notifyReportPublished(reportId) : "skipped";
  await db.update(reports).set({ emailStatus: status }).where(eq(reports.id, reportId));
  return status;
}

/** Publishes a draft. */
export async function publishReport(fd: FormData): Promise<ActionResult> {
  return adminAction("orders", async (_admin, t) => {
    const [report] = await db.select().from(reports).where(eq(reports.id, uuid(fd, "id"))).limit(1);
    if (!report) throw new FormError(t("This update no longer exists.", "هذا التحديث لم يعد موجودًا."));
    if (report.publishedAt) return { ok: true };
    await db.update(reports).set({ publishedAt: new Date() }).where(eq(reports.id, report.id));
    return { ok: true, message: publishedMessage(await publishEffects(report.id, report.orderId, report.progress, true), t) };
  });
}

export async function deleteReport(fd: FormData): Promise<ActionResult> {
  return adminAction("orders", async (_admin, t) => {
    const id = uuid(fd, "id");
    const files = await db.select({ fileId: reportAttachments.fileId }).from(reportAttachments).where(eq(reportAttachments.reportId, id));
    await db.delete(reports).where(eq(reports.id, id));
    if (files.length) await db.delete(mediaFiles).where(inArray(mediaFiles.id, files.map((f) => f.fileId)));
    return { ok: true, message: t("Update deleted.", "تم حذف التحديث.") };
  });
}
