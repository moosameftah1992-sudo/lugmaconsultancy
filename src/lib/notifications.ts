import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, orders, payments, reports, services } from "@/db/schema";
import { makeT, pick } from "@/i18n";
import type { Locale } from "@/types";
import { sendEmail, type EmailStatus } from "./email";
import { formatBhd, orderRef } from "./format";
import { getBaseUrl } from "./site";

const asLocale = (value: string): Locale => (value === "ar" ? "ar" : "en");

/** E-mails the client that a new update / report / deliverable is waiting in the portal. */
export async function notifyReportPublished(reportId: string): Promise<EmailStatus> {
  const [row] = await db
    .select({ report: reports, client: clients, order: orders, service: services })
    .from(reports)
    .innerJoin(clients, eq(clients.id, reports.clientId))
    .innerJoin(orders, eq(orders.id, reports.orderId))
    .innerJoin(services, eq(services.id, orders.serviceId))
    .where(eq(reports.id, reportId))
    .limit(1);
  if (!row) return "failed";

  const locale = asLocale(row.client.locale);
  const t = makeT(locale);
  const service = pick(locale, row.service.titleEn, row.service.titleAr);
  const kind =
    row.report.type === "report" ? t("report", "تقرير") : row.report.type === "deliverable" ? t("deliverable", "مُخرَج") : t("update", "تحديث");

  return sendEmail({
    to: row.client.email,
    kind: "report",
    locale,
    subject: t(`New ${kind} from Luqma: ${row.report.title}`, `${kind} جديد من لقمة: ${row.report.title}`),
    heading: row.report.title,
    paragraphs: [
      t(`Hello ${row.client.name},`, `مرحبًا ${row.client.name}،`),
      t(
        `A new ${kind} has been published for ${service} (${orderRef(row.order.number)}). Sign in to your private portal to read it and download any files.`,
        `تم نشر ${kind} جديد لخدمة ${service} (${orderRef(row.order.number)}). سجّل الدخول إلى بوابتك الخاصة للاطلاع عليه وتنزيل الملفات.`,
      ),
    ],
    cta: { label: t("Open my portal", "افتح بوابتي"), url: `${await getBaseUrl()}/portal/orders/${row.order.id}` },
  });
}

export async function notifyAccountActivated(clientId: string): Promise<EmailStatus> {
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return "failed";
  const locale = asLocale(client.locale);
  const t = makeT(locale);
  return sendEmail({
    to: client.email,
    kind: "activation",
    locale,
    subject: t("Your Luqma client portal is active", "تم تفعيل بوابة العميل الخاصة بك لدى لقمة"),
    heading: t("Your account is active", "تم تفعيل حسابك"),
    paragraphs: [
      t(`Hello ${client.name},`, `مرحبًا ${client.name}،`),
      t(
        "Your private dashboard is ready. You will find progress updates, reports and deliverables for every service there, and we will e-mail you whenever something new is published.",
        "لوحتك الخاصة جاهزة. ستجد فيها تحديثات التقدم والتقارير والمخرجات لكل خدمة، وسنراسلك بالبريد الإلكتروني كلما نُشر جديد.",
      ),
    ],
    cta: { label: t("Open my portal", "افتح بوابتي"), url: `${await getBaseUrl()}/portal` },
  });
}

export async function notifyPaymentConfirmed(paymentId: string): Promise<EmailStatus> {
  const [row] = await db
    .select({ payment: payments, client: clients, order: orders })
    .from(payments)
    .innerJoin(clients, eq(clients.id, payments.clientId))
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!row) return "failed";
  const locale = asLocale(row.client.locale);
  const t = makeT(locale);
  const amount = formatBhd(row.payment.amountBhd, locale);
  const ref = orderRef(row.order.number);
  return sendEmail({
    to: row.client.email,
    kind: "payment",
    locale,
    subject: t(`Payment received — ${ref}`, `تم استلام الدفعة — ${ref}`),
    heading: t("Payment received", "تم استلام الدفعة"),
    paragraphs: [
      t(`Hello ${row.client.name},`, `مرحبًا ${row.client.name}،`),
      t(
        `We have confirmed your payment of ${amount} for ${ref}${row.payment.label ? ` (${row.payment.label})` : ""}. Thank you.`,
        `أكّدنا استلام دفعتك بمبلغ ${amount} للطلب ${ref}${row.payment.label ? ` (${row.payment.label})` : ""}. شكرًا لك.`,
      ),
    ],
    cta: { label: t("View order", "عرض الطلب"), url: `${await getBaseUrl()}/portal/orders/${row.order.id}` },
  });
}
