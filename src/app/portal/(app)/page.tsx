import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { ServiceIcon } from "@/components/site/parts";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { orders, payments, reports, services } from "@/db/schema";
import { bi, makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireClient } from "@/lib/auth/session";
import { listServices } from "@/lib/data";
import { formatBhd, formatDate, orderRef } from "@/lib/format";
import { biLabel } from "@/types";

export default async function PortalDashboard() {
  const client = await requireClient();
  const locale = await getLocale();
  const t = makeT(locale);
  const active = client.status === "active";

  const [orderRows, openInvoices, latest, serviceList] = await Promise.all([
    db
      .select({ order: orders, titleEn: services.titleEn, titleAr: services.titleAr, slug: services.slug })
      .from(orders)
      .innerJoin(services, eq(services.id, orders.serviceId))
      .where(eq(orders.clientId, client.id))
      .orderBy(desc(orders.createdAt)),
    db
      .select({ id: payments.id, orderId: payments.orderId, amount: payments.amountBhd, label: payments.label, status: payments.status })
      .from(payments)
      .where(and(eq(payments.clientId, client.id), inArray(payments.status, ["due", "failed"]))),
    active
      ? db
          .select({ id: reports.id, orderId: reports.orderId, title: reports.title, type: reports.type, publishedAt: reports.publishedAt })
          .from(reports)
          .where(and(eq(reports.clientId, client.id), isNotNull(reports.publishedAt)))
          .orderBy(desc(reports.publishedAt))
          .limit(5)
      : [],
    listServices(),
  ]);
  const current = orderRows.filter((r) => !["completed", "cancelled"].includes(r.order.status));
  const past = orderRows.filter((r) => ["completed", "cancelled"].includes(r.order.status));
  const orderNumber = new Map(orderRows.map((r) => [r.order.id, r.order.number]));

  const OrderCard = ({ r }: { r: (typeof orderRows)[number] }) => (
    <li>
      <Link href={`/portal/orders/${r.order.id}`} className="card group block p-5 transition-colors hover:border-navy-300">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <ServiceIcon slug={r.slug} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-navy-900">{pick(locale, r.titleEn, r.titleAr)}</p>
              <Badge status={r.order.status}>{bi(t, biLabel("orderStatus", r.order.status))}</Badge>
            </div>
            <p className="mt-0.5 text-[13px] text-muted">
              <span dir="ltr">{orderRef(r.order.number)}</span>
              {r.order.packageName ? ` · ${r.order.packageName}` : ""} · {formatDate(r.order.createdAt, locale)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-navy-50"
                role="progressbar"
                aria-valuenow={r.order.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("Progress", "التقدّم")}
              >
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.order.progress}%` }} />
              </div>
              <span dir="ltr" className="w-10 text-end text-sm font-medium text-navy-800 tabular-nums">
                {r.order.progress}%
              </span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{t(`Welcome, ${client.name}`, `مرحبًا، ${client.name}`)}</h1>
      <p className="mt-1.5 text-[15px] text-muted">{t("Everything Luqma is doing for you, in one place.", "كل ما تنفّذه لقمة لك، في مكان واحد.")}</p>

      {!active && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-navy-900">{t("Your account is awaiting activation", "حسابك بانتظار التفعيل")}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-navy-800">
              {t(
                "You can request services right away. Progress updates, reports and deliverables unlock as soon as the Luqma team activates your account — we will e-mail you when that happens.",
                "يمكنك طلب الخدمات من الآن. تُفتح تحديثات التقدّم والتقارير والمخرجات فور تفعيل فريق لقمة لحسابك — وسنراسلك بالبريد عند ذلك.",
              )}
            </p>
          </div>
        </div>
      )}

      {openInvoices.length > 0 && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-4 sm:p-5" aria-labelledby="due-title">
          <h2 id="due-title" className="font-semibold text-navy-900">
            {t("Payments due", "دفعات مستحقة")}
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {openInvoices.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy-900 tabular-nums">{formatBhd(p.amount, locale)}</p>
                  <p className="truncate text-[13px] text-muted">
                    <span dir="ltr">{orderRef(orderNumber.get(p.orderId) ?? 0)}</span>
                    {p.label ? ` · ${p.label}` : ""}
                  </p>
                </div>
                <Link href={`/portal/orders/${p.orderId}#payments`} className="btn btn-amber btn-sm">
                  {t("Pay now", "ادفع الآن")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="services-title">
          <h2 id="services-title" className="text-lg font-semibold text-navy-900">
            {t("Your services", "خدماتك")}
          </h2>
          {orderRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-10 text-center">
              <p className="font-medium text-navy-900">{t("No services yet", "لا توجد خدمات بعد")}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[15px] leading-relaxed text-muted">
                {t("Choose a service below to send your first request.", "اختر خدمة من الأسفل لإرسال أول طلب.")}
              </p>
            </div>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {current.map((r) => (
                  <OrderCard key={r.order.id} r={r} />
                ))}
              </ul>
              {past.length > 0 && (
                <>
                  <h3 className="mt-8 text-sm font-semibold text-muted">{t("Completed & closed", "المكتملة والمغلقة")}</h3>
                  <ul className="mt-3 space-y-3">
                    {past.map((r) => (
                      <OrderCard key={r.order.id} r={r} />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="updates-title">
          <h2 id="updates-title" className="text-lg font-semibold text-navy-900">
            {t("Latest updates", "أحدث التحديثات")}
          </h2>
          <div className="card mt-4 p-5">
            {!active ? (
              <p className="text-[15px] leading-relaxed text-muted">{t("Updates appear here once your account is activated.", "تظهر التحديثات هنا بعد تفعيل حسابك.")}</p>
            ) : latest.length === 0 ? (
              <p className="text-[15px] leading-relaxed text-muted">
                {t("Nothing published yet. You will get an e-mail the moment a new update or report is ready.", "لم يُنشر شيء بعد. سيصلك بريد إلكتروني فور جاهزية تحديث أو تقرير جديد.")}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {latest.map((r) => (
                  <li key={r.id}>
                    <Link href={`/portal/orders/${r.orderId}#updates`} className="-mx-2 block rounded-lg px-2 py-3 hover:bg-navy-50/60">
                      <span className="flex items-center gap-2">
                        <Badge tone="blue">{bi(t, biLabel("reportType", r.type))}</Badge>
                        <span className="text-[13px] text-muted">{formatDate(r.publishedAt, locale)}</span>
                      </span>
                      <span className="mt-1.5 block text-[15px] font-medium text-navy-900" dir="auto">
                        {r.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="mt-12" aria-labelledby="request-title">
        <h2 id="request-title" className="text-lg font-semibold text-navy-900">
          {t("Request a service", "اطلب خدمة")}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {serviceList.map((s) => (
            <li key={s.id}>
              <Link href={`/portal/request/${s.slug}`} className="card group flex min-h-16 items-center gap-3 p-4 transition-colors hover:border-navy-300">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700">
                  <ServiceIcon slug={s.slug} className="size-5" />
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-snug font-medium text-navy-900">{pick(locale, s.titleEn, s.titleAr)}</span>
                <ArrowRight className="size-4 shrink-0 text-navy-400 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
