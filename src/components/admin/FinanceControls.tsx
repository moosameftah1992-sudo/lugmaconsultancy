"use client";

import { useId, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { bi } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { formatBhd } from "@/lib/format";
import { addFinanceEntry } from "@/server/actions/admin-misc";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, LABELS } from "@/types";

/** Records an expense (fixed or variable) or income earned outside the platform. */
export function FinanceEntryForm({ defaultDate }: { defaultDate: string }) {
  const t = useT();
  const uid = useId();
  const [kind, setKind] = useState<"expense" | "income">("expense");

  return (
    <ActionForm action={addFinanceEntry} resetOnSuccess className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" aria-label={t("Entry type", "نوع القيد")} className="flex gap-1 rounded-xl bg-navy-50 p-1">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-10 flex-1 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors ${kind === k ? "bg-white text-navy-900 shadow-sm" : "text-navy-600 hover:text-navy-900"}`}
          >
            {k === "expense" ? t("Expense", "مصروف") : t("Other income", "دخل آخر")}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-date`} className="label">
            {t("Date", "التاريخ")}
          </label>
          <input id={`${uid}-date`} type="date" name="entryDate" defaultValue={defaultDate} required className="input" />
        </div>
        <div>
          <label htmlFor={`${uid}-amount`} className="label">
            {t("Amount (BHD)", "المبلغ (د.ب)")}
          </label>
          <input id={`${uid}-amount`} name="amountBhd" dir="ltr" inputMode="decimal" placeholder="0.000" required className="input" />
        </div>
        {kind === "expense" ? (
          <>
            <div>
              <label htmlFor={`${uid}-cat`} className="label">
                {t("Category", "التصنيف")}
              </label>
              <select id={`${uid}-cat`} name="category" className="input">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {bi(t, LABELS.financeCategory[c])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-cost`} className="label">
                {t("Cost behaviour", "طبيعة التكلفة")}
              </label>
              <select id={`${uid}-cost`} name="costType" className="input">
                <option value="fixed">{t("Fixed — paid regardless of workload", "ثابتة — تُدفع بصرف النظر عن حجم العمل")}</option>
                <option value="variable">{t("Variable — grows with each client", "متغيرة — تزيد مع كل عميل")}</option>
              </select>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-inc`} className="label">
              {t("Income type", "نوع الدخل")}
            </label>
            <select id={`${uid}-inc`} name="incomeCategory" className="input">
              {INCOME_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {bi(t, LABELS.financeCategory[c])}
                </option>
              ))}
            </select>
            <p className="hint">
              {t(
                "Only for money received outside the platform. Client payments confirmed in Orders are counted automatically.",
                "للمبالغ المستلمة خارج المنصة فقط. تُحتسب مدفوعات العملاء المؤكدة في الطلبات تلقائيًا.",
              )}
            </p>
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-desc`} className="label">
            {t("Description", "الوصف")}
          </label>
          <input id={`${uid}-desc`} name="description" maxLength={300} className="input" />
        </div>
      </div>
      <SubmitButton>{t("Record entry", "تسجيل القيد")}</SubmitButton>
    </ActionForm>
  );
}

/** What-if calculator: how many clients cover the fixed costs at a given retainer. */
export function BreakEvenCalculator({ fixedCosts }: { fixedCosts: number }) {
  const t = useT();
  const locale = useLocale();
  const uid = useId();
  const [fixed, setFixed] = useState(fixedCosts > 0 ? fixedCosts.toFixed(3) : "");
  const [price, setPrice] = useState("");
  const [variable, setVariable] = useState("");

  const f = Number(fixed);
  const p = Number(price);
  const v = Number(variable) || 0;
  const ready = f > 0 && p > 0;
  const contribution = p - v;
  const clientsNeeded = ready && contribution > 0 ? Math.ceil(f / contribution) : null;

  const field = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div>
      <label htmlFor={`${uid}-${id}`} className="label">
        {label}
      </label>
      <input id={`${uid}-${id}`} dir="ltr" inputMode="decimal" value={value} onChange={(e) => set(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.000" className="input" />
    </div>
  );

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("fixed", t("Monthly fixed costs (BHD)", "التكاليف الثابتة الشهرية (د.ب)"), fixed, setFixed)}
        {field("price", t("Average fee per client / month", "متوسط الأتعاب لكل عميل شهريًا"), price, setPrice)}
        {field("var", t("Variable cost per client / month", "التكلفة المتغيرة لكل عميل شهريًا"), variable, setVariable)}
      </div>
      <div aria-live="polite" className="mt-4 rounded-xl bg-navy-50 px-4 py-3.5 text-[15px] leading-relaxed text-navy-800">
        {!ready ? (
          t("Enter your fixed costs and average fee to see how many clients you need.", "أدخل التكاليف الثابتة ومتوسط الأتعاب لمعرفة عدد العملاء المطلوب.")
        ) : clientsNeeded === null ? (
          <span className="text-red-700">
            {t("Each client costs more to serve than they pay — there is no break-even at this fee.", "تكلفة خدمة كل عميل أعلى مما يدفعه — لا توجد نقطة تعادل بهذه الأتعاب.")}
          </span>
        ) : (
          <>
            {t("You break even with", "تبلغ نقطة التعادل عند")}{" "}
            <strong className="text-navy-900 tabular-nums">
              {clientsNeeded} {t(clientsNeeded === 1 ? "client" : "clients", "عميل")}
            </strong>{" "}
            {t("— that is", "— أي")} <strong className="text-navy-900 tabular-nums">{formatBhd(clientsNeeded * p, locale)}</strong> {t("of monthly revenue. Each client contributes", "من الإيرادات الشهرية. يساهم كل عميل بـ")}{" "}
            <span className="tabular-nums">{formatBhd(contribution, locale)}</span> {t("towards fixed costs.", "في تغطية التكاليف الثابتة.")}
          </>
        )}
      </div>
    </div>
  );
}
