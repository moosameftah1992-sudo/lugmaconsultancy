import { asc, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { CheckField, Disclosure, Empty, Field, PageHeader, SelectField } from "@/components/admin/parts";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { clients, orders, payments, services } from "@/db/schema";
import { bi, makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { listPackages, listServices } from "@/lib/data";
import { formatBhd, formatDate, isUuid, orderRef } from "@/lib/format";
import { createOrderForClient } from "@/server/actions/orders";
import { BILLING_CYCLES, biLabel, LABELS, ORDER_STATUSES } from "@/types";

export default async function OrdersAdminPage({ searchParams }: { searchParams: Promise<{ status?: string; client?: string }> }) {
  await requireAdmin("orders");
  const locale = await getLocale();
  const t = makeT(locale);
  const sp = await searchParams;
  const clientFilter = isUuid(sp.client) ? sp.client : undefined;
  const statusFilter = (ORDER_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;

  const [all, clientList, serviceList, packageList] = await Promise.all([
    db
      .select({
        order: orders,
        clientName: clients.name,
        business: clients.businessName,
        titleEn: services.titleEn,
        titleAr: services.titleAr,
        toConfirm: sql<number>`(select count(*)::int from ${payments} where ${payments.orderId} = ${orders.id} and ${payments.status} = 'submitted')`,
        due: sql<number>`(select count(*)::int from ${payments} where ${payments.orderId} = ${orders.id} and ${payments.status} in ('due', 'failed'))`,
      })
      .from(orders)
      .innerJoin(clients, eq(clients.id, orders.clientId))
      .innerJoin(services, eq(services.id, orders.serviceId))
      .orderBy(desc(orders.createdAt)),
    db.select({ id: clients.id, name: clients.name, business: clients.businessName, status: clients.status }).from(clients).orderBy(asc(clients.name)),
    listServices(false),
    listPackages(),
  ]);

  const scoped = clientFilter ? all.filter((r) => r.order.clientId === clientFilter) : all;
  const rows = statusFilter ? scoped.filter((r) => r.order.status === statusFilter) : scoped;
  const href = (status?: string) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (clientFilter) q.set("client", clientFilter);
    const s = q.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };
  const serviceTitle = new Map(serviceList.map((s) => [s.id, pick(locale, s.titleEn, s.titleAr)]));
  const filteredClient = clientFilter ? clientList.find((c) => c.id === clientFilter) : undefined;

  return (
    <>
      <PageHeader
        title={t("Orders & retainers", "الطلبات والاشتراكات")}
        description={t(
          "Incoming service requests, running projects and monthly retainers. Open an order to update its status, issue invoices and publish client reports.",
          "طلبات الخدمة الواردة والمشاريع الجارية والاشتراكات الشهرية. افتح الطلب لتحديث حالته وإصدار الفواتير ونشر تقارير العميل.",
        )}
      />

      <Disclosure summary={t("+ Open an order for a client", "+ فتح طلب لعميل")}>
        {clientList.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            {t("Add a client first (Clients → Add a client account).", "أضف عميلًا أولًا (العملاء ← إضافة حساب عميل).")}
          </p>
        ) : (
          <ActionForm action={createOrderForClient} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label={t("Client", "العميل")} name="clientId" defaultValue={clientFilter}>
                {clientList
                  .filter((c) => c.status !== "suspended")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.business ? `${c.business} — ${c.name}` : c.name}
                    </option>
                  ))}
              </SelectField>
              <SelectField label={t("Package (sets service and price)", "الباقة (تحدد الخدمة والسعر)")} name="packageId">
                <option value="">{t("No package — custom engagement", "بدون باقة — عمل مخصص")}</option>
                {packageList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {serviceTitle.get(p.serviceId)} — {pick(locale, p.nameEn, p.nameAr)} ({formatBhd(p.priceBhd, locale)})
                  </option>
                ))}
              </SelectField>
              <SelectField label={t("Service (when no package is chosen)", "الخدمة (عند عدم اختيار باقة)")} name="serviceId">
                {serviceList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {pick(locale, s.titleEn, s.titleAr)}
                  </option>
                ))}
              </SelectField>
              <Field label={t("Engagement name (custom only)", "اسم العمل (للمخصص فقط)")} name="packageName" maxLength={120} />
              <Field
                label={t("Agreed amount (BHD)", "المبلغ المتفق عليه (د.ب)")}
                name="amountBhd"
                dir="ltr"
                inputMode="decimal"
                placeholder="0.000"
                hint={t("Leave empty to use the package price.", "اتركه فارغًا لاستخدام سعر الباقة.")}
              />
              <SelectField
                label={t("Billing (custom only)", "الفوترة (للمخصص فقط)")}
                name="billingCycle"
                defaultValue="one_time"
                options={BILLING_CYCLES.map((c) => [c, bi(t, LABELS.billingCycle[c])])}
              />
            </div>
            <CheckField name="invoice" label={t("Issue the first invoice now", "إصدار الفاتورة الأولى الآن")} defaultChecked />
            <SubmitButton>{t("Create order", "إنشاء الطلب")}</SubmitButton>
          </ActionForm>
        )}
      </Disclosure>

      {filteredClient && (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-sm text-navy-800">
          {t("Showing orders for", "عرض طلبات")} <strong>{filteredClient.business || filteredClient.name}</strong>
          <Link href="/admin/orders" className="text-emerald-700 hover:underline">
            {t("Show all clients", "عرض كل العملاء")}
          </Link>
        </p>
      )}

      <nav aria-label={t("Filter by status", "التصفية حسب الحالة")} className="mt-6 mb-4 flex flex-wrap gap-2">
        {[undefined, ...ORDER_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={href(s)}
            aria-current={statusFilter === s ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
              statusFilter === s ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-navy-800 hover:border-navy-300"
            }`}
          >
            {s ? bi(t, LABELS.orderStatus[s]) : t("All", "الكل")}
            <span className="tabular-nums opacity-70">{s ? scoped.filter((r) => r.order.status === s).length : scoped.length}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Empty
          title={all.length === 0 ? t("No orders yet", "لا توجد طلبات بعد") : t("Nothing matches this filter", "لا توجد نتائج لهذه التصفية")}
          body={all.length === 0 ? t("Requests submitted from the client portal appear here automatically.", "تظهر هنا تلقائيًا الطلبات المقدّمة من بوابة العملاء.") : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.order.id}>
              <Link href={`/admin/orders/${r.order.id}`} className="card flex flex-col gap-3 p-4 transition-colors hover:border-navy-300 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-navy-900">
                    <span dir="ltr">{orderRef(r.order.number)}</span>
                    <span className="font-normal text-muted">·</span>
                    <span className="truncate">{r.business || r.clientName}</span>
                  </p>
                  <p className="mt-1 text-sm text-navy-800">
                    {pick(locale, r.titleEn, r.titleAr)}
                    {r.order.packageName ? ` — ${r.order.packageName}` : ""}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {formatDate(r.order.createdAt, locale)} · {r.order.amountBhd ? `${formatBhd(r.order.amountBhd, locale)} · ${bi(t, biLabel("billingCycle", r.order.billingCycle))}` : t("Quote requested", "طلب عرض سعر")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {r.toConfirm > 0 && <Badge tone="amber">{t("Payment to confirm", "دفعة بانتظار التأكيد")}</Badge>}
                  {r.due > 0 && <Badge>{t("Invoice due", "فاتورة مستحقة")}</Badge>}
                  <Badge status={r.order.status}>{bi(t, biLabel("orderStatus", r.order.status))}</Badge>
                  <span dir="ltr" className="w-12 text-end text-sm font-medium text-navy-800 tabular-nums">
                    {r.order.progress}%
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
