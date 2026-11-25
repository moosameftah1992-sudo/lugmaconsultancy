import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentPanel } from "@/components/portal/PaymentPanel";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { orders, payments, reportAttachments, reports, services } from "@/db/schema";
import { bi, makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireClient } from "@/lib/auth/session";
import { listCheckoutMethods, listPaymentMethods } from "@/lib/data";
import { formatBhd, formatDate, formatDateTime, isUuid, orderRef } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { bhdToUsd } from "@/lib/payments/gateways";
import { biLabel } from "@/types";

export default async function PortalOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await requireClient(`/portal/orders/${id}`);
  if (!isUuid(id)) notFound();
  const locale = await getLocale();
  const t = makeT(locale);

  // Ownership is part of the query: another client's order id simply does not exist here.
  const [row] = await db
    .select({ order: orders, service: services })
    .from(orders)
    .innerJoin(services, eq(services.id, orders.serviceId))
    .where(and(eq(orders.id, id), eq(orders.clientId, client.id)))
    .limit(1);
  if (!row) notFound();
  const { order, service } = row;
  const active = client.status === "active";

  const [invoices, methods, allMethods, published] = await Promise.all([
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
    listCheckoutMethods(locale),
    listPaymentMethods(),
    active
      ? db
          .select()
          .from(reports)
          .where(and(eq(reports.orderId, id), isNotNull(reports.publishedAt)))
          .orderBy(desc(reports.publishedAt))
      : [],
  ]);
  const files = published.length ? await db.select().from(reportAttachments).where(inArray(reportAttachments.reportId, published.map((r) => r.id))) : [];
  const visibleInvoices = invoices.filter((p) => p.status !== "cancelled");
  const methodName = (key: string | null) => {
    const m = allMethods.find((x) => x.key === key);
    return m ? pick(locale, m.nameEn, m.nameAr) : "";
  };

  return (
    <>
      <Link href="/portal" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-navy-700 hover:text-emerald-700">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("My portal", "بوابتي")}
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-3xl">{pick(locale, service.titleEn, service.titleAr)}</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            <span dir="ltr">{orderRef(order.number)}</span>
            {order.packageName ? ` · ${order.packageName}` : ""} · {t("Requested", "طُلبت في")} {formatDate(order.createdAt, locale)}
          </p>
        </div>
        <Badge status={order.status}>{bi(t, biLabel("orderStatus", order.status))}</Badge>
      </header>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="progress-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="progress-title" className="font-semibold text-navy-900">
            {t("Progress", "التقدّم")}
          </h2>
          <span dir="ltr" className="text-2xl font-semibold text-navy-900 tabular-nums">
            {order.progress}%
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-navy-50" role="progressbar" aria-valuenow={order.progress} aria-valuemin={0} aria-valuemax={100} aria-labelledby="progress-title">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${order.progress}%` }} />
        </div>
        <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[13px] text-muted">{t("Fee", "الأتعاب")}</dt>
            <dd className="mt-0.5 font-medium text-navy-900 tabular-nums">
              {order.amountBhd ? `${formatBhd(order.amountBhd, locale)} · ${bi(t, biLabel("perCycle", order.billingCycle))}` : t("Quote in preparation", "عرض السعر قيد الإعداد")}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{t("Last activity", "آخر نشاط")}</dt>
            <dd className="mt-0.5 font-medium text-navy-900">{formatDate(order.updatedAt, locale)}</dd>
          </div>
          {order.contractAcceptedAt && (
            <div>
              <dt className="text-[13px] text-muted">{t("Service agreement", "اتفاقية الخدمة")}</dt>
              <dd className="mt-0.5 font-medium text-navy-900">
                {t(`Accepted ${formatDate(order.contractAcceptedAt, locale)}`, `تمت الموافقة في ${formatDate(order.contractAcceptedAt, locale)}`)}
                {order.contractVersion ? ` · v${order.contractVersion}` : ""}
              </dd>
            </div>
          )}
        </dl>
        {order.contractSnapshot && (
          <details className="mt-4">
            <summary className="inline-flex min-h-10 items-center text-sm font-medium text-emerald-700">{t("Read the agreement you accepted", "اقرأ الاتفاقية التي وافقت عليها")}</summary>
            <p className="prose-plain mt-2 max-h-96 overflow-y-auto rounded-xl bg-navy-50 p-4 text-sm">{order.contractSnapshot}</p>
          </details>
        )}
      </section>

      {visibleInvoices.length > 0 && (
        <section id="payments" className="mt-8 scroll-mt-24" aria-labelledby="payments-title">
          <h2 id="payments-title" className="text-lg font-semibold text-navy-900">
            {t("Invoices & payments", "الفواتير والمدفوعات")}
          </h2>
          <ul className="mt-4 space-y-4">
            {visibleInvoices.map((p) => {
              const payable = p.status === "due" || p.status === "failed";
              return (
                <li key={p.id} className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-navy-900 tabular-nums">{formatBhd(p.amountBhd, locale)}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {p.label}
                        {p.label ? " · " : ""}
                        {formatDate(p.createdAt, locale)}
                      </p>
                    </div>
                    <Badge status={p.status}>{bi(t, biLabel("paymentStatus", p.status))}</Badge>
                  </div>

                  {p.status === "failed" && (
                    <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800">
                      {t("The last payment attempt did not go through. You have not been charged — please try again.", "لم تكتمل محاولة الدفع الأخيرة. لم يُخصم منك أي مبلغ — يرجى المحاولة مجددًا.")}
                    </p>
                  )}
                  {p.status === "due" && p.note && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[15px] leading-relaxed text-amber-700">{p.note}</p>}
                  {payable && (
                    <div className="mt-5 border-t border-line pt-5">
                      <PaymentPanel
                        invoice={{ id: p.id, amount: formatBhd(p.amountBhd, locale), usdAmount: bhdToUsd(p.amountBhd), methodKey: p.methodKey }}
                        methods={methods}
                      />
                    </div>
                  )}
                  {p.status === "submitted" && (
                    <p className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-[15px] leading-relaxed text-navy-800">
                      {t("Thank you. We are confirming your payment", "شكرًا لك. نعمل على تأكيد دفعتك")}
                      {methodName(p.methodKey) ? ` (${methodName(p.methodKey)}` : ""}
                      {p.clientReference ? (
                        <>
                          {methodName(p.methodKey) ? " · " : " ("}
                          <span dir="ltr">{p.clientReference}</span>)
                        </>
                      ) : methodName(p.methodKey) ? (
                        ")"
                      ) : (
                        ""
                      )}
                      {t(" and will e-mail you once it is received.", " وسنراسلك فور استلامها.")}
                    </p>
                  )}
                  {p.status === "paid" && (
                    <p className="mt-3 text-sm text-muted">
                      {t("Received", "استُلمت في")} {formatDateTime(p.paidAt, locale)}
                      {methodName(p.methodKey) ? ` · ${methodName(p.methodKey)}` : ""}
                      {p.isSimulated ? ` · ${t("test payment", "دفعة تجريبية")}` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section id="updates" className="mt-10 scroll-mt-24" aria-labelledby="updates-title">
        <h2 id="updates-title" className="text-lg font-semibold text-navy-900">
          {t("Updates, reports & deliverables", "التحديثات والتقارير والمخرجات")}
        </h2>
        {!active ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[15px] leading-relaxed text-navy-800">
            {t("This section unlocks when your account is activated. We will e-mail you as soon as that happens.", "يُفتح هذا القسم عند تفعيل حسابك. سنراسلك بالبريد فور حدوث ذلك.")}
          </p>
        ) : published.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-navy-200 bg-white p-6 text-[15px] leading-relaxed text-muted">
            {order.status === "new"
              ? t("We have received your request and will be in touch shortly. Updates appear here as work begins.", "استلمنا طلبك وسنتواصل معك قريبًا. تظهر التحديثات هنا مع بدء العمل.")
              : t("Nothing has been published yet. You will receive an e-mail the moment something new is ready.", "لم يُنشر شيء بعد. سيصلك بريد إلكتروني فور جاهزية أي جديد.")}
          </p>
        ) : (
          <ol className="mt-5 space-y-5 border-s-2 border-line ps-5 sm:ps-7">
            {published.map((r) => {
              const own = files.filter((f) => f.reportId === r.id);
              return (
                <li key={r.id} className="relative">
                  <span className="absolute -start-[1.72rem] top-6 size-3.5 rounded-full border-2 border-white bg-emerald-500 sm:-start-[2.22rem]" aria-hidden="true" />
                  <article className="card p-5 sm:p-6">
                    <p className="flex flex-wrap items-center gap-2">
                      <Badge tone={r.type === "deliverable" ? "green" : r.type === "report" ? "amber" : "blue"}>{bi(t, biLabel("reportType", r.type))}</Badge>
                      <time className="text-[13px] text-muted">{formatDateTime(r.publishedAt, locale)}</time>
                      {r.progress !== null && (
                        <span dir="ltr" className="text-[13px] font-medium text-emerald-700 tabular-nums">
                          {r.progress}%
                        </span>
                      )}
                    </p>
                    <h3 className="mt-2.5 text-lg leading-snug font-semibold text-navy-900" dir="auto">
                      {r.title}
                    </h3>
                    {r.body && (
                      <p className="prose-plain mt-2" dir="auto">
                        {r.body}
                      </p>
                    )}
                    {(r.linkUrl || own.length > 0) && (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {r.linkUrl && (
                          <li>
                            <a href={r.linkUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                              <ExternalLink className="size-4" aria-hidden="true" />
                              {t("Open link", "فتح الرابط")}
                            </a>
                          </li>
                        )}
                        {own.map((f) => (
                          <li key={f.id}>
                            <a href={mediaUrl(f.fileId)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm max-w-full">
                              <Download className="size-4 shrink-0" aria-hidden="true" />
                              <span className="truncate" dir="auto">
                                {f.filename}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
