import { desc, eq, inArray } from "drizzle-orm";
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { Disclosure, Field, PageHeader, Panel, SelectField } from "@/components/admin/parts";
import { CopyField, PaymentToggle } from "@/components/admin/PaymentControls";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { clients, orders, payments, webhookEvents } from "@/db/schema";
import { makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { listPaymentMethods } from "@/lib/data";
import { formatBhd, formatDateTime, orderRef } from "@/lib/format";
import { maxUploadMb, mediaUrl } from "@/lib/media";
import { GATEWAYS, isGatewayKey, missingEnv } from "@/lib/payments/gateways";
import { getBaseUrl } from "@/lib/site";
import { savePaymentMethod, simulateWebhook } from "@/server/actions/payments";

export default async function PaymentsAdminPage() {
  await requireAdmin("payments");
  const locale = await getLocale();
  const t = makeT(locale);
  const [methods, base, events, openInvoices] = await Promise.all([
    listPaymentMethods(),
    getBaseUrl(),
    db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)).limit(15),
    db
      .select({ id: payments.id, amount: payments.amountBhd, number: orders.number, client: clients.name })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(clients, eq(clients.id, payments.clientId))
      .where(inArray(payments.status, ["due", "submitted", "failed"]))
      .orderBy(desc(payments.createdAt))
      .limit(30),
  ]);
  const enabledCount = methods.filter((m) => m.isEnabled).length;

  return (
    <>
      <PageHeader
        title={t("Payment setup & webhooks", "إعدادات الدفع والويب هوك")}
        description={t(
          "Switch payment channels on or off. A disabled channel disappears from customer checkout immediately. Gateways stay in mock mode until you add credentials and switch them to live.",
          "فعّل قنوات الدفع أو عطّلها. القناة المعطّلة تختفي من صفحة الدفع فورًا. تبقى البوابات في الوضع التجريبي حتى تضيف بيانات الاعتماد وتحوّلها إلى الوضع الحي.",
        )}
      />

      {enabledCount === 0 && (
        <p className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t(
            "No payment method is enabled. Clients can still submit requests, and are told your team will send payment details.",
            "لا توجد وسيلة دفع مفعّلة. يستطيع العملاء تقديم الطلبات، ويُبلَّغون بأن فريقك سيرسل تفاصيل الدفع.",
          )}
        </p>
      )}

      <div className="space-y-5">
        {methods.map((m) => {
          const gateway = isGatewayKey(m.key) ? GATEWAYS[m.key] : null;
          const missing = isGatewayKey(m.key) ? missingEnv(m.key) : [];
          return (
            <section key={m.key} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-navy-900">{pick(locale, m.nameEn, m.nameAr)}</h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="blue">{gateway ? t("Online gateway · webhook", "بوابة إلكترونية · ويب هوك") : t("Manual · confirmed by your team", "يدوية · يؤكدها فريقك")}</Badge>
                    {gateway && (
                      <Badge tone={m.mode === "live" ? "green" : "amber"}>{m.mode === "live" ? t("Live mode", "الوضع الحي") : t("Mock mode", "الوضع التجريبي")}</Badge>
                    )}
                    {m.key === "benefit_qr" && !m.qrFileId && <Badge tone="amber">{t("QR code not uploaded", "لم يُرفع رمز QR")}</Badge>}
                    {m.key === "bank_transfer" && !m.config.iban && <Badge tone="amber">{t("IBAN missing", "الآيبان غير مُدخل")}</Badge>}
                  </div>
                </div>
                <PaymentToggle key={`${m.key}-${m.isEnabled}`} methodKey={m.key} enabled={m.isEnabled} name={pick(locale, m.nameEn, m.nameAr)} />
              </div>

              {gateway && m.isEnabled && m.mode === "mock" && (
                <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-700">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {t(
                    "Enabled in mock mode: customers see this option marked “test” and can complete checkout without real money. Test payments are flagged and excluded from finance figures. Use for testing only.",
                    "مفعّلة في الوضع التجريبي: يرى العملاء هذا الخيار بعلامة «تجريبي» ويمكنهم إتمام الدفع دون مال حقيقي. تُميَّز الدفعات التجريبية وتُستثنى من الأرقام المالية. للاختبار فقط.",
                  )}
                </p>
              )}

              <div className="mt-5">
                <Disclosure summary={t("Configure", "الإعداد")}>
                  <ActionForm action={savePaymentMethod} className="space-y-4">
                    <input type="hidden" name="key" value={m.key} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("Name at checkout (English)", "الاسم في صفحة الدفع (بالإنجليزية)")} name="nameEn" dir="ltr" required maxLength={120} defaultValue={m.nameEn} />
                      <Field label={t("Name at checkout (Arabic)", "الاسم في صفحة الدفع (بالعربية)")} name="nameAr" dir="rtl" required maxLength={120} defaultValue={m.nameAr} />
                      <Field label={t("Instructions for the customer (English)", "تعليمات للعميل (بالإنجليزية)")} name="instructionsEn" dir="ltr" textarea rows={3} defaultValue={m.instructionsEn} />
                      <Field label={t("Instructions for the customer (Arabic)", "تعليمات للعميل (بالعربية)")} name="instructionsAr" dir="rtl" textarea rows={3} defaultValue={m.instructionsAr} />
                    </div>

                    {m.key === "benefit_qr" && (
                      <div className="rounded-xl border border-line p-4">
                        <p className="label">{t("BenefitPay QR code", "رمز QR لبنفت بي")}</p>
                        <div className="flex flex-wrap items-start gap-4">
                          {m.qrFileId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mediaUrl(m.qrFileId)} alt={t("Current BenefitPay QR code", "رمز QR الحالي لبنفت بي")} className="size-36 rounded-xl border border-line bg-white object-contain p-1" />
                          ) : (
                            <div className="grid size-36 place-items-center rounded-xl border border-dashed border-navy-200 px-3 text-center text-[13px] text-muted">
                              {t("No QR uploaded", "لم يُرفع رمز")}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 basis-60">
                            <input
                              type="file"
                              name="qr"
                              data-upload="qr"
                              accept="image/png,image/jpeg,image/webp"
                              aria-label={t("Upload BenefitPay QR code image", "رفع صورة رمز QR لبنفت بي")}
                              className="input file:me-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white"
                            />
                            <p className="hint">
                              {t(
                                `Choose the QR image saved from your BenefitPay merchant app (PNG, JPG or WebP, up to ${maxUploadMb()} MB). It is shown to clients who pick this method.`,
                                `اختر صورة الرمز المحفوظة من تطبيق التاجر في بنفت بي (PNG أو JPG أو WebP، حتى ${maxUploadMb()} ميغابايت). تظهر للعملاء الذين يختارون هذه الوسيلة.`,
                              )}
                            </p>
                            {m.qrFileId && (
                              <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm text-navy-800">
                                <input type="checkbox" name="removeQr" className="check" />
                                {t("Remove the current QR code", "إزالة رمز QR الحالي")}
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {m.key === "bank_transfer" && (
                      <div className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2">
                        <Field label={t("Bank name", "اسم البنك")} name="bankName" maxLength={120} defaultValue={m.config.bankName} />
                        <Field label={t("Account holder", "اسم صاحب الحساب")} name="accountName" maxLength={160} defaultValue={m.config.accountName} />
                        <Field label="IBAN" name="iban" dir="ltr" maxLength={40} placeholder="BH00 XXXX 0000 0000 0000 00" defaultValue={m.config.iban} />
                        <Field label="SWIFT / BIC" name="swift" dir="ltr" maxLength={20} defaultValue={m.config.swift} />
                      </div>
                    )}

                    {gateway && (
                      <div className="space-y-4 rounded-xl border border-line p-4">
                        <SelectField
                          label={t("Mode", "الوضع")}
                          name="mode"
                          defaultValue={m.mode}
                          options={[
                            ["mock", t("Mock — no money moves", "تجريبي — لا تُحوَّل أموال")],
                            ["live", t("Live — real payments", "حي — مدفوعات حقيقية")],
                          ]}
                          hint={t("Live mode can only be saved once every credential below is present.", "لا يمكن حفظ الوضع الحي إلا بعد توفر جميع بيانات الاعتماد أدناه.")}
                        />
                        <div>
                          <p className="label">{t("Server credentials (environment variables)", "بيانات الاعتماد على الخادم (متغيرات البيئة)")}</p>
                          <ul className="space-y-1.5">
                            {gateway.requiredEnv.map((name) => {
                              const ok = !missing.includes(name);
                              return (
                                <li key={name} className="flex items-center gap-2 text-sm">
                                  {ok ? <CircleCheck className="size-4 text-emerald-600" aria-hidden="true" /> : <CircleX className="size-4 text-red-600" aria-hidden="true" />}
                                  <code dir="ltr" className="text-[13px] text-navy-800">
                                    {name}
                                  </code>
                                  <span className={ok ? "text-emerald-700" : "text-red-700"}>{ok ? t("set", "مضبوط") : t("missing", "غير مضبوط")}</span>
                                </li>
                              );
                            })}
                          </ul>
                          <p className="hint">
                            {t("Secrets are read from the server environment only and are never stored in the database or shown here.", "تُقرأ الأسرار من بيئة الخادم فقط ولا تُخزَّن في قاعدة البيانات ولا تُعرض هنا.")}
                          </p>
                        </div>
                        <CopyField label={t("Webhook URL — register this with the provider", "رابط الويب هوك — سجّله لدى المزوّد")} value={`${base}/api/webhooks/${m.key}`} />
                      </div>
                    )}
                    <SubmitButton>{t("Save configuration", "حفظ الإعداد")}</SubmitButton>
                  </ActionForm>
                </Disclosure>
              </div>

              {gateway && (
                <div className="mt-3">
                  <Disclosure summary={t("Send a test event", "إرسال حدث تجريبي")}>
                    {openInvoices.length === 0 ? (
                      <p className="text-sm leading-relaxed text-muted">
                        {t("There is no open invoice to test with. Issue one from an order first.", "لا توجد فاتورة مفتوحة للاختبار. أصدر فاتورة من أحد الطلبات أولًا.")}
                      </p>
                    ) : (
                      <ActionForm action={simulateWebhook} className="space-y-4">
                        <input type="hidden" name="provider" value={m.key} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <SelectField label={t("Open invoice", "فاتورة مفتوحة")} name="paymentId">
                            {openInvoices.map((p) => (
                              <option key={p.id} value={p.id}>
                                {orderRef(p.number)} · {p.client} · {formatBhd(p.amount, locale)}
                              </option>
                            ))}
                          </SelectField>
                          <SelectField
                            label={t("Simulated result", "النتيجة المحاكاة")}
                            name="outcome"
                            options={[
                              ["paid", t("Payment captured", "تم تحصيل الدفعة")],
                              ["failed", t("Payment failed", "فشلت الدفعة")],
                            ]}
                          />
                        </div>
                        <p className="hint">
                          {t(
                            "Runs through the same pipeline as a real webhook. The invoice is marked as a test payment and stays out of finance figures.",
                            "يمر عبر المسار نفسه الذي يمر به الويب هوك الحقيقي. تُميَّز الفاتورة كدفعة تجريبية وتبقى خارج الأرقام المالية.",
                          )}
                        </p>
                        <SubmitButton className="btn btn-ghost">{t("Send test event", "إرسال الحدث التجريبي")}</SubmitButton>
                      </ActionForm>
                    )}
                  </Disclosure>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-8">
        <Panel title={t("Recent webhook events", "أحدث أحداث الويب هوك")} description={t("Every event received or simulated, with its verification result.", "كل حدث تم استلامه أو محاكاته مع نتيجة التحقق.")}>
          {events.length === 0 ? (
            <p className="text-sm text-muted">{t("No events yet.", "لا توجد أحداث بعد.")}</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-start text-sm">
                <thead>
                  <tr className="text-[13px] text-muted">
                    <th className="px-2 py-2 text-start font-medium">{t("When", "الوقت")}</th>
                    <th className="px-2 py-2 text-start font-medium">{t("Gateway", "البوابة")}</th>
                    <th className="px-2 py-2 text-start font-medium">{t("Signature", "التوقيع")}</th>
                    <th className="px-2 py-2 text-start font-medium">{t("Result", "النتيجة")}</th>
                    <th className="px-2 py-2 text-start font-medium">{t("Detail", "التفاصيل")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="px-2 py-2.5 whitespace-nowrap text-navy-800">{formatDateTime(e.createdAt, locale)}</td>
                      <td className="px-2 py-2.5" dir="ltr">
                        {e.provider}
                      </td>
                      <td className="px-2 py-2.5">
                        {e.simulated ? <Badge tone="amber">{t("Test", "تجريبي")}</Badge> : e.signatureValid ? <Badge tone="green">{t("Verified", "موثّق")}</Badge> : <Badge tone="red">{t("Rejected", "مرفوض")}</Badge>}
                      </td>
                      <td className="px-2 py-2.5">
                        <Badge status={e.status}>{e.status}</Badge>
                      </td>
                      <td className="px-2 py-2.5 text-[13px] text-muted">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
