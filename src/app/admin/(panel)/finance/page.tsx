import { and, desc, gte, lt } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { BreakEvenCalculator, FinanceEntryForm } from "@/components/admin/FinanceControls";
import { PageHeader, Panel, Stat } from "@/components/admin/parts";
import { ActionButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { financeEntries } from "@/db/schema";
import { bi, makeT } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { getMonthSummary, getTrend, isMonth, monthRange, shiftMonth } from "@/lib/finance";
import { currentMonth, formatBhd, formatDate, formatMonth, today } from "@/lib/format";
import { deleteFinanceEntry } from "@/server/actions/admin-misc";
import { biLabel } from "@/types";

const pct = (value: number | null) => (value === null ? "—" : `${(value * 100).toFixed(1)}%`);

export default async function FinanceAdminPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin("finance");
  const locale = await getLocale();
  const t = makeT(locale);
  const sp = await searchParams;
  const thisMonth = currentMonth();
  const month = isMonth(sp.m) ? sp.m : thisMonth;
  const { start, end } = monthRange(month);

  const [summary, trend, entries] = await Promise.all([
    getMonthSummary(month),
    getTrend(month, 6),
    db
      .select()
      .from(financeEntries)
      .where(and(gte(financeEntries.entryDate, start), lt(financeEntries.entryDate, end)))
      .orderBy(desc(financeEntries.entryDate), desc(financeEntries.createdAt)),
  ]);

  const trendMax = Math.max(1, ...trend.flatMap((p) => [p.revenue, p.expenses]));
  const expenseRows = summary.byCategory.filter((c) => c.kind === "expense");
  const incomeRows = [
    ...(summary.platformRevenue > 0 ? [{ label: t("Client payments (platform)", "مدفوعات العملاء (المنصة)"), total: summary.platformRevenue }] : []),
    ...summary.byCategory.filter((c) => c.kind === "income").map((c) => ({ label: bi(t, biLabel("financeCategory", c.category)), total: c.total })),
  ];
  const hasData = summary.revenue > 0 || summary.expenses > 0;
  const gap = summary.breakEvenRevenue !== null ? summary.revenue - summary.breakEvenRevenue : null;

  return (
    <>
      <PageHeader
        title={t("Finance & cost control", "المالية وضبط التكاليف")}
        description={t(
          "Monthly profit and loss in BHD. Confirmed client payments are counted automatically; record expenses and any outside income here.",
          "الأرباح والخسائر الشهرية بالدينار البحريني. تُحتسب مدفوعات العملاء المؤكدة تلقائيًا، وسجّل هنا المصروفات وأي دخل خارجي.",
        )}
      />

      <div className="mb-6 flex items-center gap-2">
        <Link href={`/admin/finance?m=${shiftMonth(month, -1)}`} className="btn btn-ghost btn-sm !px-2.5" aria-label={t("Previous month", "الشهر السابق")}>
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
        <p className="min-w-40 text-center text-lg font-semibold text-navy-900">{formatMonth(month, locale)}</p>
        {month < thisMonth ? (
          <Link href={`/admin/finance?m=${shiftMonth(month, 1)}`} className="btn btn-ghost btn-sm !px-2.5" aria-label={t("Next month", "الشهر التالي")}>
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        ) : (
          <span className="btn btn-ghost btn-sm !px-2.5 opacity-40" aria-hidden="true">
            <ChevronRight className="size-4 rtl:rotate-180" />
          </span>
        )}
        {month !== thisMonth && (
          <Link href="/admin/finance" className="ms-2 text-sm font-medium text-emerald-700 hover:underline">
            {t("Current month", "الشهر الحالي")}
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("Revenue", "الإيرادات")} value={formatBhd(summary.revenue, locale)} note={t(`${formatBhd(summary.platformRevenue, locale)} from client payments`, `${formatBhd(summary.platformRevenue, locale)} من مدفوعات العملاء`)} />
        <Stat label={t("Expenses", "المصروفات")} value={formatBhd(summary.expenses, locale)} note={t(`Fixed ${formatBhd(summary.fixedCosts, locale)} · variable ${formatBhd(summary.variableCosts, locale)}`, `ثابتة ${formatBhd(summary.fixedCosts, locale)} · متغيرة ${formatBhd(summary.variableCosts, locale)}`)} />
        <Stat
          label={summary.netProfit < 0 ? t("Net loss", "صافي الخسارة") : t("Net profit", "صافي الربح")}
          value={formatBhd(summary.netProfit, locale)}
          tone={summary.netProfit < 0 ? "red" : summary.netProfit > 0 ? "green" : "navy"}
          note={t(`Net margin ${pct(summary.marginPct)}`, `هامش صافي ${pct(summary.marginPct)}`)}
        />
        <Stat
          label={t("Break-even revenue", "إيرادات نقطة التعادل")}
          value={summary.breakEvenRevenue !== null ? formatBhd(summary.breakEvenRevenue, locale) : "—"}
          tone={gap === null ? "navy" : gap >= 0 ? "green" : "amber"}
          note={
            gap === null
              ? t("Needs revenue this month to compute", "يتطلب إيرادات هذا الشهر لاحتسابها")
              : gap >= 0
                ? t(`${formatBhd(gap, locale)} above break-even`, `${formatBhd(gap, locale)} فوق نقطة التعادل`)
                : t(`${formatBhd(-gap, locale)} short of break-even`, `ينقص ${formatBhd(-gap, locale)} لبلوغ التعادل`)
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={t("Six-month trend", "اتجاه ستة أشهر")}>
          <div className="flex items-center gap-4 text-[13px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-emerald-500" /> {t("Revenue", "الإيرادات")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-amber-400" /> {t("Expenses", "المصروفات")}
            </span>
          </div>
          <div className="mt-4 flex h-44 items-end gap-3" aria-hidden="true">
            {trend.map((p) => (
              <div key={p.month} className="flex h-full flex-1 items-end justify-center gap-1">
                <div className="w-full max-w-5 rounded-t bg-emerald-500" style={{ height: `${p.revenue > 0 ? Math.max(2, (p.revenue / trendMax) * 100) : 0}%` }} />
                <div className="w-full max-w-5 rounded-t bg-amber-400" style={{ height: `${p.expenses > 0 ? Math.max(2, (p.expenses / trendMax) * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3 border-t border-line pt-2">
            {trend.map((p) => (
              <Link key={p.month} href={`/admin/finance?m=${p.month}`} className={`flex-1 text-center text-xs ${p.month === month ? "font-semibold text-navy-900" : "text-muted hover:text-navy-900"}`}>
                {formatMonth(p.month, locale, "short")}
              </Link>
            ))}
          </div>
          <table className="sr-only">
            <caption>{t("Revenue and expenses by month", "الإيرادات والمصروفات حسب الشهر")}</caption>
            <thead>
              <tr>
                <th>{t("Month", "الشهر")}</th>
                <th>{t("Revenue", "الإيرادات")}</th>
                <th>{t("Expenses", "المصروفات")}</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((p) => (
                <tr key={p.month}>
                  <td>{formatMonth(p.month, locale)}</td>
                  <td>{formatBhd(p.revenue, locale)}</td>
                  <td>{formatBhd(p.expenses, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!trend.some((p) => p.revenue > 0 || p.expenses > 0) && (
            <p className="mt-3 text-sm text-muted">{t("No financial activity recorded in this period yet.", "لا يوجد نشاط مالي مسجّل في هذه الفترة بعد.")}</p>
          )}
        </Panel>

        <Panel title={t("Where the money went", "أين ذهبت الأموال")}>
          {!hasData ? (
            <p className="text-sm leading-relaxed text-muted">
              {t("Nothing recorded for this month. Add your first expense below.", "لا توجد قيود لهذا الشهر. أضف أول مصروف من الأسفل.")}
            </p>
          ) : (
            <div className="space-y-5">
              {incomeRows.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-semibold text-emerald-700">{t("Income", "الدخل")}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {incomeRows.map((r) => (
                      <li key={r.label} className="flex justify-between gap-3 text-sm">
                        <span className="text-navy-800">{r.label}</span>
                        <span className="font-medium text-navy-900 tabular-nums">{formatBhd(r.total, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expenseRows.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-semibold text-amber-700">{t("Expenses by category", "المصروفات حسب التصنيف")}</h3>
                  <ul className="mt-2 space-y-3">
                    {expenseRows.map((r) => (
                      <li key={`${r.category}-${r.costType}`}>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-navy-800">
                            {bi(t, biLabel("financeCategory", r.category))}{" "}
                            <span className="text-[13px] text-muted">· {r.costType === "variable" ? t("variable", "متغيرة") : t("fixed", "ثابتة")}</span>
                          </span>
                          <span className="font-medium text-navy-900 tabular-nums">{formatBhd(r.total, locale)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-50">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${summary.expenses > 0 ? (r.total / summary.expenses) * 100 : 0}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title={t("Break-even analysis", "تحليل نقطة التعادل")}
          description={t(
            "Break-even revenue = fixed costs ÷ contribution margin, where contribution margin = (revenue − variable costs) ÷ revenue.",
            "إيرادات التعادل = التكاليف الثابتة ÷ هامش المساهمة، حيث هامش المساهمة = (الإيرادات − التكاليف المتغيرة) ÷ الإيرادات.",
          )}
        >
          <dl className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              [t("Fixed costs this month", "التكاليف الثابتة هذا الشهر"), formatBhd(summary.fixedCosts, locale)],
              [t("Variable costs this month", "التكاليف المتغيرة هذا الشهر"), formatBhd(summary.variableCosts, locale)],
              [t("Contribution margin", "هامش المساهمة"), pct(summary.contributionRatio)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line px-4 py-3">
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd dir="ltr" className="mt-1 text-lg font-semibold text-navy-900 tabular-nums rtl:text-right">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <h3 className="mb-3 text-sm font-semibold text-navy-900">{t("Planning calculator", "حاسبة التخطيط")}</h3>
          <BreakEvenCalculator key={month} fixedCosts={summary.fixedCosts} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel title={t("Record an entry", "تسجيل قيد")}>
          <FinanceEntryForm key={month} defaultDate={month === thisMonth ? today() : start} />
        </Panel>

        <Panel title={t(`Entries — ${formatMonth(month, locale)}`, `القيود — ${formatMonth(month, locale)}`)}>
          {entries.length === 0 ? (
            <p className="text-sm text-muted">{t("No entries recorded for this month.", "لا توجد قيود مسجّلة لهذا الشهر.")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-navy-900">
                      {bi(t, biLabel("financeCategory", e.category))}
                      {e.kind === "income" ? <Badge tone="green">{t("Income", "دخل")}</Badge> : <Badge>{e.costType === "variable" ? t("Variable", "متغيرة") : t("Fixed", "ثابتة")}</Badge>}
                    </p>
                    <p className="truncate text-[13px] text-muted">
                      {formatDate(`${e.entryDate}T12:00:00Z`, locale)}
                      {e.description ? ` · ${e.description}` : ""}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${e.kind === "income" ? "text-emerald-700" : "text-navy-900"}`}>
                    {e.kind === "income" ? "+" : "−"} {formatBhd(e.amountBhd, locale)}
                  </p>
                  <ActionButton action={deleteFinanceEntry} fields={{ id: e.id }} className="btn btn-danger btn-sm" confirm={t("Delete this entry?", "حذف هذا القيد؟")}>
                    {t("Delete", "حذف")}
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
