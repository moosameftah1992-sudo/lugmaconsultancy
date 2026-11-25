import { desc, eq, inArray } from "drizzle-orm";
import { ArrowLeft, Paperclip } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckField, Disclosure, Field, PageHeader, Panel, SelectField } from "@/components/admin/parts";
import { ActionButton, ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { clients, orders, payments, reportAttachments, reports, services } from "@/db/schema";
import { bi, makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { listPaymentMethods } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { formatBhd, formatDate, formatDateTime, isUuid, orderRef } from "@/lib/format";
import { maxUploadMb, mediaUrl } from "@/lib/media";
import { deleteReport, publishReport, saveReport, updateOrder } from "@/server/actions/orders";
import { createInvoice, reviewPayment } from "@/server/actions/payments";
import { BILLING_CYCLES, biLabel, LABELS, ORDER_STATUSES, REPORT_TYPES } from "@/types";

export default async function OrderAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const locale = await getLocale();
  const t = makeT(locale);

  const [row] = await db
    .select({ order: orders, client: clients, service: services })
    .from(orders)
    .innerJoin(clients, eq(clients.id, orders.clientId))
    .innerJoin(services, eq(services.id, orders.serviceId))
    .where(eq(orders.id, id))
    .limit(1);
  if (!row) notFound();
  const { order, client, service } = row;

  const [invoiceRows, reportRows, methods] = await Promise.all([
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
    db.select().from(reports).where(eq(reports.orderId, id)).orderBy(desc(reports.createdAt)),
    listPaymentMethods(),
  ]);
  const attachments = reportRows.length
    ? await db.select().from(reportAttachments).where(inArray(reportAttachments.reportId, reportRows.map((r) => r.id)))
    : [];
  const methodName = (key: string | null) => {
    const m = methods.find((x) => x.key === key);
    return m ? pick(locale, m.nameEn, m.nameAr) : key ? key : t("Not chosen", "لم تُحدَّد");
  };
  const manualMethods = methods.filter((m) => m.type === "manual");
  const emailStatusLabel: Record<string, string> = {
    sent: t("E-mail sent", "أُرسل البريد"),
    failed: t("E-mail failed", "فشل البريد"),
    not_configured: t("No e-mail (SMTP not set up)", "لا بريد (SMTP غير مُعد)"),
    skipped: t("No e-mail requested", "لم يُطلب بريد"),
  };

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-navy-700 hover:text-emerald-700">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("All orders", "كل الطلبات")}
      </Link>
      <PageHeader title={`${orderRef(order.number)} · ${client.businessName || client.name}`} description={`${pick(locale, service.titleEn, service.titleAr)}${order.packageName ? ` — ${order.packageName}` : ""}`}>
        <Badge status={order.status}>{bi(t, biLabel("orderStatus", order.status))}</Badge>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-6">
          <Panel title={t("Status & progress", "الحالة والتقدّم")}>
            <ActionForm action={updateOrder} className="space-y-4">
              <input type="hidden" name="id" value={order.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label={t("Status", "الحالة")} name="status" defaultValue={order.status} options={ORDER_STATUSES.map((s) => [s, bi(t, LABELS.orderStatus[s])])} />
                <Field label={t("Progress (%)", "نسبة التقدّم (%)")} name="progress" type="number" min={0} max={100} defaultValue={order.progress} hint={t("Shown to the client as a progress bar.", "تظهر للعميل كشريط تقدّم.")} />
                <Field label={t("Agreed amount (BHD)", "المبلغ المتفق عليه (د.ب)")} name="amountBhd" dir="ltr" inputMode="decimal" placeholder={t("Quote pending", "بانتظار التسعير")} defaultValue={order.amountBhd} />
                <SelectField label={t("Billing", "الفوترة")} name="billingCycle" defaultValue={order.billingCycle} options={BILLING_CYCLES.map((c) => [c, bi(t, LABELS.billingCycle[c])])} />
              </div>
              <Field label={t("Internal notes (never shown to the client)", "ملاحظات داخلية (لا تظهر للعميل)")} name="adminNotes" textarea rows={3} defaultValue={order.adminNotes} />
              <SubmitButton>{t("Save order", "حفظ الطلب")}</SubmitButton>
            </ActionForm>
          </Panel>

          <Panel title={t("Client", "العميل")}>
            <dl className="space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">{t("Contact", "جهة الاتصال")}</dt>
                <dd className="font-medium text-navy-900">{client.name}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">{t("E-mail", "البريد الإلكتروني")}</dt>
                <dd>
                  <a href={`mailto:${client.email}`} dir="ltr" className="text-emerald-700 hover:underline">
                    {client.email}
                  </a>
                </dd>
              </div>
              {client.phone && (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted">{t("Phone", "الهاتف")}</dt>
                  <dd dir="ltr">{client.phone}</dd>
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">{t("Account", "الحساب")}</dt>
                <dd>
                  <Badge status={client.status}>{bi(t, biLabel("clientStatus", client.status))}</Badge>
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">{t("Requested", "تاريخ الطلب")}</dt>
                <dd>{formatDateTime(order.createdAt, locale)}</dd>
              </div>
            </dl>
            {client.status !== "active" && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-700">
                {t("This client is not activated, so they cannot see reports yet. Activate the account under Clients.", "هذا العميل غير مفعّل ولا يستطيع رؤية التقارير بعد. فعّل الحساب من صفحة العملاء.")}
              </p>
            )}
            {order.clientNotes && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[13px] font-medium text-muted">{t("Client's note", "ملاحظة العميل")}</p>
                <p className="prose-plain mt-1">{order.clientNotes}</p>
              </div>
            )}
            {order.contractAcceptedAt && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm text-navy-800">
                  {t(
                    `Service agreement${order.contractVersion ? ` v${order.contractVersion}` : ""} accepted on ${formatDateTime(order.contractAcceptedAt, locale)}.`,
                    `تمت الموافقة على اتفاقية الخدمة${order.contractVersion ? ` (الإصدار ${order.contractVersion})` : ""} في ${formatDateTime(order.contractAcceptedAt, locale)}.`,
                  )}
                </p>
                {order.contractSnapshot && (
                  <details className="mt-2">
                    <summary className="inline-flex min-h-9 items-center text-sm font-medium text-emerald-700">{t("View the accepted text", "عرض النص الموافق عليه")}</summary>
                    <p className="prose-plain mt-2 max-h-80 overflow-y-auto rounded-xl bg-navy-50 p-4 text-sm">{order.contractSnapshot}</p>
                  </details>
                )}
              </div>
            )}
          </Panel>

          <Panel title={t("Invoices & payments", "الفواتير والمدفوعات")} description={t("Issue an invoice for each billing period; the client pays it from the portal.", "أصدر فاتورة لكل فترة فوترة، ويدفعها العميل من البوابة.")}>
            {invoiceRows.length === 0 ? (
              <p className="text-sm text-muted">{t("No invoices issued for this order yet.", "لم تُصدر فواتير لهذا الطلب بعد.")}</p>
            ) : (
              <ul className="space-y-3">
                {invoiceRows.map((p) => (
                  <li key={p.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy-900 tabular-nums">{formatBhd(p.amountBhd, locale)}</p>
                        <p className="text-sm text-navy-800">{p.label}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.isSimulated && <Badge tone="amber">{t("Test payment", "دفعة تجريبية")}</Badge>}
                        <Badge status={p.status}>{bi(t, biLabel("paymentStatus", p.status))}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">
                      {t("Issued", "أُصدرت")} {formatDate(p.createdAt, locale)} · {methodName(p.methodKey)}
                      {p.clientReference && (
                        <>
                          {" · "}
                          {t("Client reference", "مرجع العميل")}: <span dir="ltr" className="font-medium text-navy-900">{p.clientReference}</span>
                        </>
                      )}
                      {p.paidAt && ` · ${t("Paid", "دُفعت")} ${formatDateTime(p.paidAt, locale)}`}
                      {p.note && ` · ${p.note}`}
                    </p>

                    {p.status === "submitted" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionButton action={reviewPayment} fields={{ id: p.id, decision: "confirm" }} className="btn btn-accent btn-sm">
                          {t("Confirm payment received", "تأكيد استلام الدفعة")}
                        </ActionButton>
                        <ActionButton
                          action={reviewPayment}
                          fields={{ id: p.id, decision: "reject" }}
                          className="btn btn-ghost btn-sm"
                          confirm={t("Mark this payment as not received? The client will be asked to pay again.", "تسجيل الدفعة كغير مستلمة؟ سيُطلب من العميل الدفع مجددًا.")}
                        >
                          {t("Not received", "لم تُستلم")}
                        </ActionButton>
                      </div>
                    )}
                    {(p.status === "due" || p.status === "failed") && (
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <ActionForm action={reviewPayment} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="decision" value="confirm" />
                          <label className="sr-only" htmlFor={`method-${p.id}`}>
                            {t("Received through", "تم الاستلام عبر")}
                          </label>
                          <select id={`method-${p.id}`} name="methodKey" defaultValue={p.methodKey ?? "cash"} className="input !min-h-9 w-auto py-1.5 text-sm">
                            {manualMethods.map((m) => (
                              <option key={m.key} value={m.key}>
                                {pick(locale, m.nameEn, m.nameAr)}
                              </option>
                            ))}
                          </select>
                          <SubmitButton className="btn btn-ghost btn-sm">{t("Record as paid", "تسجيل كمدفوعة")}</SubmitButton>
                        </ActionForm>
                        <ActionButton
                          action={reviewPayment}
                          fields={{ id: p.id, decision: "cancel" }}
                          className="btn btn-danger btn-sm"
                          confirm={t("Cancel this invoice?", "إلغاء هذه الفاتورة؟")}
                        >
                          {t("Cancel invoice", "إلغاء الفاتورة")}
                        </ActionButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Disclosure summary={t("+ Issue an invoice", "+ إصدار فاتورة")}>
                <ActionForm action={createInvoice} resetOnSuccess className="space-y-4">
                  <input type="hidden" name="orderId" value={order.id} />
                  <Field label={t("What is it for?", "ما سبب الفاتورة؟")} name="label" required maxLength={160} placeholder={t("e.g. Retainer — next month", "مثال: الاشتراك — الشهر القادم")} />
                  <Field label={t("Amount (BHD)", "المبلغ (د.ب)")} name="amountBhd" dir="ltr" required inputMode="decimal" placeholder="0.000" defaultValue={order.amountBhd} />
                  <SubmitButton>{t("Issue invoice", "إصدار الفاتورة")}</SubmitButton>
                </ActionForm>
              </Disclosure>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title={t("Publish an update, report or deliverable", "نشر تحديث أو تقرير أو مُخرَج")}
            description={t("Published items appear in the client's private portal straight away.", "تظهر العناصر المنشورة في بوابة العميل الخاصة مباشرة.")}
          >
            {!emailConfigured() && (
              <p className="mb-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-700">
                {t(
                  "SMTP is not configured, so notification e-mails cannot be sent yet. Items are still published to the portal. See Settings.",
                  "لم يتم إعداد SMTP، لذلك لا يمكن إرسال بريد الإشعارات بعد. تُنشر العناصر في البوابة على أي حال. راجع الإعدادات.",
                )}
              </p>
            )}
            <ActionForm action={saveReport} resetOnSuccess className="space-y-4">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <SelectField label={t("Type", "النوع")} name="type" options={REPORT_TYPES.map((r) => [r, bi(t, LABELS.reportType[r])])} />
                <Field label={t("Title", "العنوان")} name="title" required maxLength={200} />
              </div>
              <Field label={t("Message to the client", "رسالة إلى العميل")} name="body" textarea rows={6} hint={t("Write in the client's language.", "اكتب بلغة العميل.")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Link (optional)", "رابط (اختياري)")} name="linkUrl" type="url" dir="ltr" inputMode="url" placeholder="https://" hint={t("e.g. a shared folder or live page.", "مثل مجلد مشترك أو صفحة منشورة.")} />
                <Field label={t("Set progress to (%)", "تحديث نسبة التقدّم إلى (%)")} name="progress" type="number" min={0} max={100} placeholder={String(order.progress)} hint={t("Leave empty to keep the current value.", "اتركه فارغًا للإبقاء على القيمة الحالية.")} />
              </div>
              <div>
                <label htmlFor="report-files" className="label">
                  {t("Attach files (optional)", "إرفاق ملفات (اختياري)")}
                </label>
                <input
                  id="report-files"
                  type="file"
                  name="files"
                  data-upload="report"
                  multiple
                  className="input file:me-3 file:rounded-full file:border-0 file:bg-navy-100 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-navy-900"
                />
                <p className="hint">
                  {t(`PDF, Office documents, images, video or ZIP — up to ${maxUploadMb()} MB each. Only this client can download them.`, `PDF أو مستندات أوفيس أو صور أو فيديو أو ZIP — حتى ${maxUploadMb()} ميغابايت لكل ملف. لا يستطيع تنزيلها إلا هذا العميل.`)}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <CheckField name="publish" label={t("Publish now", "النشر الآن")} hint={t("Untick to save a draft.", "ألغِ التحديد للحفظ كمسودة.")} defaultChecked />
                <CheckField name="notify" label={t("Notify the client by e-mail", "إشعار العميل بالبريد الإلكتروني")} defaultChecked />
              </div>
              <SubmitButton className="btn btn-accent">{t("Save update", "حفظ التحديث")}</SubmitButton>
            </ActionForm>
          </Panel>

          <Panel title={t("History", "السجل")}>
            {reportRows.length === 0 ? (
              <p className="text-sm text-muted">{t("Nothing has been published for this order yet.", "لم يُنشر شيء لهذا الطلب بعد.")}</p>
            ) : (
              <ul className="space-y-4">
                {reportRows.map((r) => {
                  const files = attachments.filter((a) => a.reportId === r.id);
                  return (
                    <li key={r.id} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="blue">{bi(t, biLabel("reportType", r.type))}</Badge>
                        {r.publishedAt ? <Badge tone="green">{t("Published", "منشور")}</Badge> : <Badge tone="amber">{t("Draft", "مسودة")}</Badge>}
                        {r.emailStatus && <Badge status={r.emailStatus}>{emailStatusLabel[r.emailStatus] ?? r.emailStatus}</Badge>}
                      </div>
                      <p className="mt-2 font-semibold text-navy-900">{r.title}</p>
                      <p className="text-[13px] text-muted">
                        {formatDateTime(r.publishedAt ?? r.createdAt, locale)}
                        {r.createdByName ? ` · ${r.createdByName}` : ""}
                        {r.progress !== null ? ` · ${r.progress}%` : ""}
                      </p>
                      {r.body && <p className="prose-plain mt-2 line-clamp-4 text-sm">{r.body}</p>}
                      {r.linkUrl && (
                        <a href={r.linkUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="mt-2 block truncate text-sm text-emerald-700 hover:underline">
                          {r.linkUrl}
                        </a>
                      )}
                      {files.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {files.map((f) => (
                            <li key={f.id}>
                              <a href={mediaUrl(f.fileId)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] text-navy-800 hover:bg-navy-50">
                                <Paperclip className="size-3.5" aria-hidden="true" />
                                {f.filename}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!r.publishedAt && (
                          <ActionButton action={publishReport} fields={{ id: r.id }} className="btn btn-accent btn-sm">
                            {t("Publish and notify", "نشر وإشعار")}
                          </ActionButton>
                        )}
                        <ActionButton
                          action={deleteReport}
                          fields={{ id: r.id }}
                          className="btn btn-danger btn-sm"
                          confirm={t("Delete this update and its files? The client will no longer see it.", "حذف هذا التحديث وملفاته؟ لن يراه العميل بعد ذلك.")}
                        >
                          {t("Delete", "حذف")}
                        </ActionButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
