"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { useT } from "@/i18n/client";
import { startGatewayPayment, submitManualPayment } from "@/server/actions/portal";
import type { CheckoutMethod } from "@/types";

/**
 * Lets a client settle one invoice. Only the channels currently enabled by the
 * admin are passed in, so a disabled method never appears here.
 */
export function PaymentPanel({
  invoice,
  methods,
}: {
  invoice: { id: string; amount: string; usdAmount: string; methodKey: string | null };
  methods: CheckoutMethod[];
}) {
  const t = useT();
  const [selected, setSelected] = useState(methods.find((m) => m.key === invoice.methodKey)?.key ?? methods[0]?.key ?? "");
  const method = methods.find((m) => m.key === selected);

  if (methods.length === 0) {
    return (
      <p className="rounded-xl bg-navy-50 px-4 py-3 text-[15px] leading-relaxed text-navy-800">
        {t("Our team will contact you with payment details for this invoice.", "سيتواصل معك فريقنا بتفاصيل الدفع لهذه الفاتورة.")}
      </p>
    );
  }

  return (
    <div>
      <fieldset>
        <legend className="label">{t("How would you like to pay?", "كيف تودّ الدفع؟")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {methods.map((m) => (
            <label
              key={m.key}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[15px] transition-colors ${
                selected === m.key ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "border-line bg-white hover:border-navy-300"
              }`}
            >
              <input type="radio" name={`method-${invoice.id}`} value={m.key} checked={selected === m.key} onChange={() => setSelected(m.key)} className="size-4 accent-emerald-600" />
              <span className="min-w-0 flex-1 font-medium text-navy-900">{m.name}</span>
              {m.type === "gateway" && m.mode === "mock" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{t("Test", "تجريبي")}</span>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      {method?.type === "manual" && (
        <ActionForm key={method.key} action={submitManualPayment} className="mt-5">
          <input type="hidden" name="paymentId" value={invoice.id} />
          <input type="hidden" name="methodKey" value={method.key} />
          {method.instructions && <p className="text-[15px] leading-relaxed text-navy-800">{method.instructions}</p>}

          {method.qrUrl && (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-line bg-white p-4 sm:w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={method.qrUrl} alt={t("BenefitPay QR code to scan", "رمز QR لبنفت بي للمسح")} className="size-52 object-contain" />
              <p className="text-sm font-semibold text-navy-900 tabular-nums">{invoice.amount}</p>
            </div>
          )}

          {method.bank && (
            <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-2xl border border-line bg-white p-4 text-sm sm:grid-cols-2">
              {(
                [
                  [t("Bank", "البنك"), method.bank.bankName],
                  [t("Account holder", "صاحب الحساب"), method.bank.accountName],
                  ["IBAN", method.bank.iban],
                  ["SWIFT / BIC", method.bank.swift],
                  [t("Amount", "المبلغ"), invoice.amount],
                ] as const
              )
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[13px] text-muted">{label}</dt>
                    <dd dir="ltr" className="font-medium break-all text-navy-900 select-all rtl:text-right">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
          )}

          {method.key !== "cash" && (
            <div className="mt-4 max-w-sm">
              <label htmlFor={`ref-${invoice.id}`} className="label">
                {t("Transaction reference", "الرقم المرجعي للعملية")}
              </label>
              <input id={`ref-${invoice.id}`} name="reference" dir="ltr" required minLength={4} maxLength={80} className="input" autoComplete="off" />
              <p className="hint">{t("Shown on your payment receipt.", "يظهر في إيصال الدفع.")}</p>
            </div>
          )}
          <SubmitButton className="btn btn-accent mt-5">
            {method.key === "cash" ? t("I will pay in person", "سأدفع مباشرة") : t("I have paid — confirm my payment", "دفعت — أكّدوا دفعتي")}
          </SubmitButton>
        </ActionForm>
      )}

      {method?.type === "gateway" && (
        <ActionForm key={method.key} action={startGatewayPayment} className="mt-5">
          <input type="hidden" name="paymentId" value={invoice.id} />
          <input type="hidden" name="methodKey" value={method.key} />
          {method.instructions && <p className="text-[15px] leading-relaxed text-navy-800">{method.instructions}</p>}
          {method.key === "paypal" && (
            <p className="mt-2 text-[15px] text-navy-800">
              {t("You will be charged", "سيُخصم منك")} <strong dir="ltr">USD {invoice.usdAmount}</strong>.
            </p>
          )}
          {method.mode === "mock" && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-700">
              {t("Test mode: no real money will be taken.", "وضع تجريبي: لن يُخصم أي مبلغ حقيقي.")}
            </p>
          )}
          <SubmitButton className="btn btn-accent mt-5">{t(`Pay ${invoice.amount}`, `ادفع ${invoice.amount}`)}</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
