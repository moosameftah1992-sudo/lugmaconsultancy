import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { bi, makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireClient } from "@/lib/auth/session";
import { getContract, getServiceBySlug, listCheckoutMethods, listPackages } from "@/lib/data";
import { formatBhd, isUuid } from "@/lib/format";
import { createOrder } from "@/server/actions/portal";
import { biLabel } from "@/types";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ package?: string }> };

/** Checkout: choose a package, read and accept the SLA, pick a payment method, submit. */
export default async function RequestServicePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { package: wanted } = await searchParams;
  await requireClient(`/portal/request/${slug}${isUuid(wanted) ? `?package=${wanted}` : ""}`);
  const locale = await getLocale();
  const t = makeT(locale);

  const service = await getServiceBySlug(slug);
  if (!service || !service.isActive) notFound();
  const [pkgs, contract, methods] = await Promise.all([listPackages({ serviceId: service.id, activeOnly: true }), getContract(service.id), listCheckoutMethods(locale)]);
  const preselected = pkgs.find((p) => p.id === wanted)?.id ?? pkgs[0]?.id ?? "";
  const option = "flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-navy-300 has-checked:border-emerald-600 has-checked:bg-emerald-50 has-checked:ring-1 has-checked:ring-emerald-600";

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/portal" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-navy-700 hover:text-emerald-700">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("My portal", "بوابتي")}
      </Link>
      <p className="eyebrow mt-4">{t("Service request", "طلب خدمة")}</p>
      <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-3xl">{pick(locale, service.titleEn, service.titleAr)}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{pick(locale, service.summaryEn, service.summaryAr)}</p>

      <ActionForm action={createOrder} className="mt-8 space-y-8">
        <input type="hidden" name="service" value={service.slug} />

        <fieldset>
          <legend className="text-lg font-semibold text-navy-900">{t("1. Choose a package", "1. اختر الباقة")}</legend>
          <div className="mt-3 space-y-2.5">
            {pkgs.map((p) => (
              <label key={p.id} className={option}>
                <input type="radio" name="packageId" value={p.id} defaultChecked={p.id === preselected} className="mt-1 size-4 accent-emerald-600" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-semibold text-navy-900">{pick(locale, p.nameEn, p.nameAr)}</span>
                    <span className="font-semibold text-navy-900 tabular-nums">
                      {formatBhd(p.priceBhd, locale)} <span className="text-sm font-normal text-muted">{bi(t, biLabel("perCycle", p.billingCycle))}</span>
                    </span>
                  </span>
                  {pick(locale, p.descriptionEn, p.descriptionAr) && (
                    <span className="mt-1 block text-sm leading-relaxed text-muted">{pick(locale, p.descriptionEn, p.descriptionAr)}</span>
                  )}
                </span>
              </label>
            ))}
            <label className={option}>
              <input type="radio" name="packageId" value="" defaultChecked={!preselected} className="mt-1 size-4 accent-emerald-600" />
              <span>
                <span className="font-semibold text-navy-900">{pkgs.length ? t("Something different — send me a quote", "شيء مختلف — أرسلوا لي عرض سعر") : t("Request a quote", "اطلب عرض سعر")}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  {t("Describe what you need below. We reply with a scope and a fixed price in BHD. Nothing is charged now.", "صف ما تحتاجه في الأسفل. نرد عليك بنطاق العمل وسعر ثابت بالدينار البحريني. لا يُخصم شيء الآن.")}
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="rq-notes" className="text-lg font-semibold text-navy-900">
            {t("2. Tell us about your restaurant", "2. حدّثنا عن مطعمك")}
          </label>
          <textarea
            id="rq-notes"
            name="notes"
            rows={4}
            maxLength={2000}
            className="input mt-3"
            placeholder={t("Location, number of branches, what you want to achieve…", "الموقع، عدد الفروع، ما الذي تريد تحقيقه…")}
          />
        </div>

        {pkgs.length > 0 && (
          <fieldset>
            <legend className="text-lg font-semibold text-navy-900">{t("3. Payment method", "3. وسيلة الدفع")}</legend>
            {methods.length === 0 ? (
              <p className="mt-3 rounded-xl bg-navy-50 px-4 py-3 text-[15px] leading-relaxed text-navy-800">
                {t("No payment is taken now. After reviewing your request, our team will send you the payment details.", "لا يُخصم أي مبلغ الآن. بعد مراجعة طلبك سيرسل لك فريقنا تفاصيل الدفع.")}
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {t("You complete the payment on the next screen. Not needed for quote requests.", "تُكمل الدفع في الشاشة التالية. غير مطلوبة لطلبات عرض السعر.")}
                </p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {methods.map((m, i) => (
                    <label key={m.key} className={`${option} items-center`}>
                      <input type="radio" name="methodKey" value={m.key} defaultChecked={i === 0} className="size-4 accent-emerald-600" />
                      <span className="min-w-0 flex-1 font-medium text-navy-900">{m.name}</span>
                      {m.type === "gateway" && m.mode === "mock" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{t("Test", "تجريبي")}</span>
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}
          </fieldset>
        )}

        <div>
          <h2 className="text-lg font-semibold text-navy-900">{pkgs.length > 0 ? t("4. Service agreement", "4. اتفاقية الخدمة") : t("3. Service agreement", "3. اتفاقية الخدمة")}</h2>
          {contract && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-4" tabIndex={0} role="region" aria-label={pick(locale, contract.titleEn, contract.titleAr)}>
              <p className="font-semibold text-navy-900">{pick(locale, contract.titleEn, contract.titleAr)}</p>
              <p className="mt-0.5 text-[13px] text-muted">{t(`Version ${contract.version}`, `الإصدار ${contract.version}`)}</p>
              <p className="prose-plain mt-3 text-sm">{pick(locale, contract.bodyEn, contract.bodyAr)}</p>
            </div>
          )}
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed text-navy-900">
            <input type="checkbox" name="accept" required className="check mt-1" />
            {t("I have read and accept this service agreement on behalf of my business.", "قرأت اتفاقية الخدمة هذه وأوافق عليها بالنيابة عن منشأتي.")}
          </label>
        </div>

        <SubmitButton className="btn btn-amber w-full sm:w-auto">{t("Submit request", "إرسال الطلب")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
