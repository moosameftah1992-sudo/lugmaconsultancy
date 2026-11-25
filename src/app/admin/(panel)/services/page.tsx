import Link from "next/link";
import { CheckField, Disclosure, Field, PageHeader, SelectField } from "@/components/admin/parts";
import { ServiceIcon } from "@/components/site/parts";
import { ActionButton, ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { bi, makeT, pick, type TFn } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { listPackages, listServices } from "@/lib/data";
import { formatBhd } from "@/lib/format";
import { deletePackage, savePackage, saveService } from "@/server/actions/catalog";
import { BILLING_CYCLES, biLabel, LABELS } from "@/types";

type PackageRow = Awaited<ReturnType<typeof listPackages>>[number];

function PackageForm({ t, serviceId, pkg }: { t: TFn; serviceId: string; pkg?: PackageRow }) {
  return (
    <ActionForm action={savePackage} resetOnSuccess={!pkg} className="space-y-4">
      {pkg ? <input type="hidden" name="id" value={pkg.id} /> : <input type="hidden" name="serviceId" value={serviceId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Package name (English)", "اسم الباقة (بالإنجليزية)")} name="nameEn" dir="ltr" required maxLength={120} defaultValue={pkg?.nameEn} />
        <Field label={t("Package name (Arabic)", "اسم الباقة (بالعربية)")} name="nameAr" dir="rtl" maxLength={120} defaultValue={pkg?.nameAr} />
        <Field
          label={t("Price (BHD)", "السعر (د.ب)")}
          name="priceBhd"
          dir="ltr"
          required
          inputMode="decimal"
          placeholder="0.000"
          defaultValue={pkg?.priceBhd}
          hint={t("Up to three decimals (fils).", "حتى ثلاث خانات عشرية (فلس).")}
        />
        <SelectField
          label={t("Billing", "الفوترة")}
          name="billingCycle"
          defaultValue={pkg?.billingCycle ?? "monthly"}
          options={BILLING_CYCLES.map((c) => [c, bi(t, LABELS.billingCycle[c])])}
          hint={t("Monthly, quarterly and yearly packages are retainers.", "الباقات الشهرية والربع سنوية والسنوية اشتراكات دورية.")}
        />
        <Field label={t("Short description (English)", "وصف قصير (بالإنجليزية)")} name="descriptionEn" dir="ltr" maxLength={400} defaultValue={pkg?.descriptionEn} />
        <Field label={t("Short description (Arabic)", "وصف قصير (بالعربية)")} name="descriptionAr" dir="rtl" maxLength={400} defaultValue={pkg?.descriptionAr} />
        <Field label={t("What is included (English, one per line)", "ما تتضمنه (بالإنجليزية، بند في كل سطر)")} name="featuresEn" dir="ltr" textarea rows={4} defaultValue={pkg?.featuresEn} />
        <Field label={t("What is included (Arabic, one per line)", "ما تتضمنه (بالعربية، بند في كل سطر)")} name="featuresAr" dir="rtl" textarea rows={4} defaultValue={pkg?.featuresAr} />
        <Field label={t("Display order", "ترتيب العرض")} name="sortOrder" type="number" min={0} max={9999} defaultValue={pkg?.sortOrder ?? 0} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <CheckField name="isActive" label={t("Offered on the website", "معروضة في الموقع")} defaultChecked={pkg?.isActive ?? true} />
        <CheckField name="isFeatured" label={t("Highlight as “most chosen”", "تمييزها كـ«الأكثر اختيارًا»")} defaultChecked={pkg?.isFeatured ?? false} />
      </div>
      <SubmitButton>{pkg ? t("Save package", "حفظ الباقة") : t("Add package", "إضافة الباقة")}</SubmitButton>
    </ActionForm>
  );
}

export default async function ServicesAdminPage() {
  await requireAdmin("services");
  const locale = await getLocale();
  const t = makeT(locale);
  const [services, pkgs] = await Promise.all([listServices(false), listPackages()]);

  return (
    <>
      <PageHeader
        title={t("Services & pricing", "الخدمات والأسعار")}
        description={t(
          "Edit the six pillars and control every package, retainer and price in BHD. Changes appear on the website immediately.",
          "عدّل الركائز الست وتحكّم بكل باقة واشتراك وسعر بالدينار البحريني. تظهر التغييرات في الموقع فورًا.",
        )}
      />

      <div className="space-y-6">
        {services.map((s) => {
          const own = pkgs.filter((p) => p.serviceId === s.id);
          return (
            <section key={s.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ServiceIcon slug={s.slug} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg leading-snug font-semibold text-navy-900">{pick(locale, s.titleEn, s.titleAr)}</h2>
                  <Link href={`/services/${s.slug}`} target="_blank" dir="ltr" className="text-[13px] text-emerald-700 hover:underline">
                    /services/{s.slug}
                  </Link>
                </div>
                <Badge tone={s.isActive ? "green" : "neutral"}>{s.isActive ? t("Visible", "ظاهرة") : t("Hidden", "مخفية")}</Badge>
              </div>

              <div className="mt-5">
                <Disclosure summary={t("Edit service content", "تعديل محتوى الخدمة")}>
                  <ActionForm action={saveService} className="space-y-4">
                    <input type="hidden" name="id" value={s.id} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("Title (English)", "العنوان (بالإنجليزية)")} name="titleEn" dir="ltr" required maxLength={160} defaultValue={s.titleEn} />
                      <Field label={t("Title (Arabic)", "العنوان (بالعربية)")} name="titleAr" dir="rtl" required maxLength={160} defaultValue={s.titleAr} />
                      <Field label={t("Summary (English)", "الملخص (بالإنجليزية)")} name="summaryEn" dir="ltr" textarea rows={3} maxLength={400} defaultValue={s.summaryEn} />
                      <Field label={t("Summary (Arabic)", "الملخص (بالعربية)")} name="summaryAr" dir="rtl" textarea rows={3} maxLength={400} defaultValue={s.summaryAr} />
                      <Field label={t("Description (English)", "الوصف (بالإنجليزية)")} name="descriptionEn" dir="ltr" textarea rows={5} defaultValue={s.descriptionEn} />
                      <Field label={t("Description (Arabic)", "الوصف (بالعربية)")} name="descriptionAr" dir="rtl" textarea rows={5} defaultValue={s.descriptionAr} />
                      <Field label={t("Deliverables (English, one per line)", "المخرجات (بالإنجليزية، بند في كل سطر)")} name="deliverablesEn" dir="ltr" textarea rows={6} defaultValue={s.deliverablesEn} />
                      <Field label={t("Deliverables (Arabic, one per line)", "المخرجات (بالعربية، بند في كل سطر)")} name="deliverablesAr" dir="rtl" textarea rows={6} defaultValue={s.deliverablesAr} />
                    </div>
                    <CheckField name="isActive" label={t("Show this service on the website", "عرض هذه الخدمة في الموقع")} defaultChecked={s.isActive} />
                    <SubmitButton>{t("Save service", "حفظ الخدمة")}</SubmitButton>
                  </ActionForm>
                </Disclosure>
              </div>

              <h3 className="mt-6 text-sm font-semibold text-navy-900">
                {t("Packages & retainers", "الباقات والاشتراكات")} <span className="text-muted tabular-nums">({own.length})</span>
              </h3>
              {own.length === 0 ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t("No priced packages yet — visitors see “Request a quote” for this service.", "لا توجد باقات مسعّرة بعد — يرى الزوار «اطلب عرض سعر» لهذه الخدمة.")}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {own.map((p) => (
                    <li key={p.id} className="rounded-xl border border-line p-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 pb-3">
                        <p className="min-w-0 flex-1 font-medium text-navy-900">{pick(locale, p.nameEn, p.nameAr)}</p>
                        <p className="text-sm font-semibold text-navy-900 tabular-nums">
                          {formatBhd(p.priceBhd, locale)} <span className="font-normal text-muted">· {bi(t, biLabel("billingCycle", p.billingCycle))}</span>
                        </p>
                        <div className="flex gap-1.5">
                          {!p.isActive && <Badge>{t("Not offered", "غير معروضة")}</Badge>}
                          {p.isFeatured && <Badge tone="amber">{t("Highlighted", "مميّزة")}</Badge>}
                        </div>
                        <ActionButton
                          action={deletePackage}
                          fields={{ id: p.id }}
                          className="btn btn-danger btn-sm"
                          confirm={t("Delete this package? Existing orders keep their agreed price.", "حذف هذه الباقة؟ تحتفظ الطلبات الحالية بسعرها المتفق عليه.")}
                        >
                          {t("Delete", "حذف")}
                        </ActionButton>
                      </div>
                      <Disclosure summary={t("Edit package and price", "تعديل الباقة والسعر")}>
                        <PackageForm t={t} serviceId={s.id} pkg={p} />
                      </Disclosure>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <Disclosure summary={t("+ Add a package", "+ إضافة باقة")}>
                  <PackageForm t={t} serviceId={s.id} />
                </Disclosure>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
