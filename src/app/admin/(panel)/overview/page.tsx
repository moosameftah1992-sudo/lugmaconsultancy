import { desc, eq, sql } from "drizzle-orm";
import { ArrowRight, CircleCheck, CircleDashed } from "lucide-react";
import Link from "next/link";
import { PageHeader, Panel, Stat } from "@/components/admin/parts";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { clients, orders, packages, paymentMethods, portfolioItems, services } from "@/db/schema";
import { bi, makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getAttentionCounts } from "@/lib/admin-data";
import { can, requireAdmin } from "@/lib/auth/session";
import { emailConfigured } from "@/lib/email";
import { getMonthSummary } from "@/lib/finance";
import { currentMonth, formatBhd, formatDate, formatMonth, orderRef } from "@/lib/format";
import { getSiteSettings } from "@/lib/site";
import { biLabel } from "@/types";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdmin();
  const locale = await getLocale();
  const t = makeT(locale);
  const { denied } = await searchParams;
  const month = currentMonth();

  const [counts, finance, site, [methods], [pkgCount], [portfolioCount], recent] = await Promise.all([
    getAttentionCounts(),
    can(admin, "finance") ? getMonthSummary(month) : null,
    getSiteSettings(),
    db.select({ n: sql<number>`(count(*) filter (where ${paymentMethods.isEnabled}))::int` }).from(paymentMethods),
    db.select({ n: sql<number>`count(*)::int` }).from(packages),
    db.select({ n: sql<number>`(count(*) filter (where ${portfolioItems.isPublished}))::int` }).from(portfolioItems),
    can(admin, "orders")
      ? db
          .select({ order: orders, clientName: clients.name, business: clients.businessName, titleEn: services.titleEn, titleAr: services.titleAr })
          .from(orders)
          .innerJoin(clients, eq(clients.id, orders.clientId))
          .innerJoin(services, eq(services.id, orders.serviceId))
          .orderBy(desc(orders.createdAt))
          .limit(6)
      : [],
  ]);

  const checklist = [
    { done: Boolean(site.email || site.phone || site.whatsapp), href: "/admin/settings", label: t("Add your public contact details", "أضف بيانات التواصل العامة") },
    { done: emailConfigured(), href: "/admin/settings", label: t("Connect SMTP so clients receive e-mail notifications", "اربط SMTP ليصل العملاء إشعارات البريد") },
    { done: (pkgCount?.n ?? 0) > 0, href: "/admin/services", label: t("Price your first package or retainer", "سعّر أول باقة أو اشتراك") },
    { done: (methods?.n ?? 0) > 0, href: "/admin/payments", label: t("Enable at least one payment method", "فعّل وسيلة دفع واحدة على الأقل") },
    { done: (portfolioCount?.n ?? 0) > 0, href: "/admin/portfolio", label: t("Publish your first portfolio item", "انشر أول عمل في المعرض") },
  ];
  const remaining = checklist.filter((c) => !c.done).length;

  return (
    <>
      <PageHeader
        title={t(`Welcome, ${admin.name}`, `مرحبًا، ${admin.name}`)}
        description={t("What needs attention across Luqma today.", "ما يحتاج إلى متابعتك في لقمة اليوم.")}
      />

      {denied && (
        <p role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t("Your account does not have access to that section.", "حسابك لا يملك صلاحية الوصول إلى ذلك القسم.")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("New service requests", "طلبات خدمة جديدة")} value={String(counts.newOrders)} note={t(`${counts.activeOrders} in progress`, `${counts.activeOrders} قيد التنفيذ`)} tone={counts.newOrders ? "amber" : "navy"} />
        <Stat label={t("Payments to confirm", "دفعات بانتظار التأكيد")} value={String(counts.paymentsToConfirm)} note={t(`${counts.paymentsDue} invoices still due`, `${counts.paymentsDue} فواتير مستحقة`)} tone={counts.paymentsToConfirm ? "amber" : "navy"} />
        <Stat label={t("Clients awaiting activation", "عملاء بانتظار التفعيل")} value={String(counts.pendingClients)} note={t(`${counts.activeClients} active clients`, `${counts.activeClients} عميل مفعّل`)} tone={counts.pendingClients ? "amber" : "navy"} />
        <Stat label={t("New inquiries", "استفسارات جديدة")} value={String(counts.newInquiries)} tone={counts.newInquiries ? "amber" : "navy"} />
      </div>

      {finance && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat label={t(`Revenue — ${formatMonth(month, locale)}`, `الإيرادات — ${formatMonth(month, locale)}`)} value={formatBhd(finance.revenue, locale)} />
          <Stat label={t("Expenses", "المصروفات")} value={formatBhd(finance.expenses, locale)} />
          <Stat label={t("Net profit", "صافي الربح")} value={formatBhd(finance.netProfit, locale)} tone={finance.netProfit < 0 ? "red" : finance.netProfit > 0 ? "green" : "navy"} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {can(admin, "orders") && (
          <Panel
            title={t("Latest requests", "أحدث الطلبات")}
            aside={
              <Link href="/admin/orders" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline">
                {t("All orders", "كل الطلبات")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            }
          >
            {recent.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted">
                {t("No service requests yet. They appear here the moment a client submits one.", "لا توجد طلبات خدمة بعد. ستظهر هنا فور تقديم العميل طلبًا.")}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((r) => (
                  <li key={r.order.id}>
                    <Link href={`/admin/orders/${r.order.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-navy-50/60">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-navy-900">
                          <span dir="ltr">{orderRef(r.order.number)}</span> · {r.business || r.clientName}
                        </span>
                        <span className="block truncate text-[13px] text-muted">
                          {pick(locale, r.titleEn, r.titleAr)} · {formatDate(r.order.createdAt, locale)}
                        </span>
                      </span>
                      <Badge status={r.order.status}>{bi(t, biLabel("orderStatus", r.order.status))}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {remaining > 0 && (
          <Panel title={t("Launch checklist", "قائمة الإطلاق")} description={t(`${remaining} step(s) left before the platform is fully live.`, `بقيت ${remaining} خطوة قبل اكتمال جاهزية المنصة.`)}>
            <ul className="space-y-1">
              {checklist.map((c) => (
                <li key={c.label}>
                  <Link href={c.href} className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-navy-50/60">
                    {c.done ? (
                      <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <CircleDashed className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
                    )}
                    <span className={c.done ? "text-muted line-through" : "text-navy-900"}>{c.label}</span>
                    <span className="sr-only">{c.done ? t("(done)", "(منجز)") : t("(to do)", "(مطلوب)")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
