import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { financeEntries, payments } from "@/db/schema";

export const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

const pad = (n: number) => String(n).padStart(2, "0");

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export const monthRange = (month: string) => ({ start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` });

export interface CategoryTotal {
  kind: "income" | "expense";
  category: string;
  costType: "fixed" | "variable" | null;
  total: number;
}

export interface MonthSummary {
  month: string;
  /** Confirmed client payments recorded by the platform (mock-mode payments excluded). */
  platformRevenue: number;
  /** Income entered manually (work billed outside the platform). */
  otherIncome: number;
  revenue: number;
  fixedCosts: number;
  variableCosts: number;
  expenses: number;
  netProfit: number;
  /** Net profit ÷ revenue. null when there is no revenue. */
  marginPct: number | null;
  /** (Revenue − variable costs) ÷ revenue. null when there is no revenue. */
  contributionRatio: number | null;
  /** Fixed costs ÷ contribution ratio. null when it cannot be computed. */
  breakEvenRevenue: number | null;
  byCategory: CategoryTotal[];
}

export async function getMonthSummary(month: string): Promise<MonthSummary> {
  const { start, end } = monthRange(month);

  const [platform] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amountBhd}), 0)` })
    .from(payments)
    .where(
      and(
        eq(payments.status, "paid"),
        eq(payments.isSimulated, false),
        sql`(${payments.paidAt} at time zone 'Asia/Bahrain')::date >= ${start}::date`,
        sql`(${payments.paidAt} at time zone 'Asia/Bahrain')::date < ${end}::date`,
      ),
    );

  const rows = await db
    .select({
      kind: financeEntries.kind,
      category: financeEntries.category,
      costType: financeEntries.costType,
      total: sql<string>`sum(${financeEntries.amountBhd})`,
    })
    .from(financeEntries)
    .where(and(gte(financeEntries.entryDate, start), lt(financeEntries.entryDate, end)))
    .groupBy(financeEntries.kind, financeEntries.category, financeEntries.costType);

  const byCategory: CategoryTotal[] = rows
    .map((r) => ({
      kind: (r.kind === "income" ? "income" : "expense") as CategoryTotal["kind"],
      category: r.category,
      costType: r.kind === "income" ? null : ((r.costType === "variable" ? "variable" : "fixed") as "fixed" | "variable"),
      total: Number(r.total),
    }))
    .sort((a, b) => b.total - a.total);

  const sum = (filter: (c: CategoryTotal) => boolean) => byCategory.filter(filter).reduce((acc, c) => acc + c.total, 0);
  const platformRevenue = Number(platform?.total ?? 0);
  const otherIncome = sum((c) => c.kind === "income");
  const fixedCosts = sum((c) => c.kind === "expense" && c.costType === "fixed");
  const variableCosts = sum((c) => c.kind === "expense" && c.costType === "variable");
  const revenue = platformRevenue + otherIncome;
  const expenses = fixedCosts + variableCosts;
  const netProfit = revenue - expenses;
  const contributionRatio = revenue > 0 ? (revenue - variableCosts) / revenue : null;

  return {
    month,
    platformRevenue,
    otherIncome,
    revenue,
    fixedCosts,
    variableCosts,
    expenses,
    netProfit,
    marginPct: revenue > 0 ? netProfit / revenue : null,
    contributionRatio,
    breakEvenRevenue: contributionRatio !== null && contributionRatio > 0 ? fixedCosts / contributionRatio : null,
    byCategory,
  };
}

export interface TrendPoint {
  month: string;
  revenue: number;
  expenses: number;
}

/** Revenue and expenses for the `count` months ending with `month`. */
export async function getTrend(month: string, count = 6): Promise<TrendPoint[]> {
  const { start } = monthRange(month);
  const result = await db.execute(sql`
    select to_char(m, 'YYYY-MM') as month,
      (select coalesce(sum(p.amount_bhd), 0) from payments p
        where p.status = 'paid' and p.is_simulated = false
          and (p.paid_at at time zone 'Asia/Bahrain') >= m
          and (p.paid_at at time zone 'Asia/Bahrain') < m + interval '1 month')
      + (select coalesce(sum(f.amount_bhd), 0) from finance_entries f
        where f.kind = 'income' and f.entry_date >= m::date and f.entry_date < (m + interval '1 month')::date) as revenue,
      (select coalesce(sum(f.amount_bhd), 0) from finance_entries f
        where f.kind = 'expense' and f.entry_date >= m::date and f.entry_date < (m + interval '1 month')::date) as expenses
    from generate_series(${start}::date - make_interval(months => ${count - 1}::int), ${start}::date, interval '1 month') as m
    order by m
  `);
  return (result.rows as Array<Record<string, unknown>>).map((r) => ({
    month: String(r.month),
    revenue: Number(r.revenue),
    expenses: Number(r.expenses),
  }));
}
