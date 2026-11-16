import { asc, eq } from "drizzle-orm";
import { Disclosure, Field, PageHeader } from "@/components/admin/parts";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { ensureBootstrap } from "@/db/bootstrap";
import { contracts, services } from "@/db/schema";
import { makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { saveContract } from "@/server/actions/catalog";

export default async function ContractsAdminPage() {
  await requireAdmin("contracts");
  const locale = await getLocale();
  const t = makeT(locale);
  await ensureBootstrap();
  const rows = await db
    .select({ contract: contracts, service: services })
    .from(contracts)
    .innerJoin(services, eq(services.id, contracts.serviceId))
    .orderBy(asc(services.sortOrder));

  return (
    <>
      <PageHeader
        title={t("Contracts & service-level agreements", "العقود واتفاقيات مستوى الخدمة")}
        description={t(
          "One agreement per service. Clients must accept the current version at checkout; each order keeps a copy of the exact text it accepted. Have the wording reviewed by your legal counsel.",
          "اتفاقية واحدة لكل خدمة. يوافق العملاء على الإصدار الحالي عند تقديم الطلب، ويحتفظ كل طلب بنسخة من النص الذي وافق عليه. يُنصح بمراجعة الصياغة مع مستشارك القانوني.",
        )}
      />

      <div className="space-y-4">
        {rows.map(({ contract, service }) => (
          <Disclosure
            key={contract.id}
            summary={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
                <span className="text-[15px] font-semibold text-navy-900">{pick(locale, service.titleEn, service.titleAr)}</span>
                <Badge tone="blue">{t(`Version ${contract.version}`, `الإصدار ${contract.version}`)}</Badge>
                <span className="text-[13px] font-normal text-muted">
                  {t("Updated", "آخر تحديث")} {formatDateTime(contract.updatedAt, locale)}
                  {contract.updatedBy ? ` · ${contract.updatedBy}` : ""}
                </span>
              </span>
            }
          >
            <ActionForm action={saveContract} className="space-y-4">
              <input type="hidden" name="id" value={contract.id} />
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label={t("Title (English)", "العنوان (بالإنجليزية)")} name="titleEn" dir="ltr" required maxLength={200} defaultValue={contract.titleEn} />
                <Field label={t("Title (Arabic)", "العنوان (بالعربية)")} name="titleAr" dir="rtl" required maxLength={200} defaultValue={contract.titleAr} />
                <Field label={t("Agreement text (English)", "نص الاتفاقية (بالإنجليزية)")} name="bodyEn" dir="ltr" required textarea rows={22} defaultValue={contract.bodyEn} />
                <Field label={t("Agreement text (Arabic)", "نص الاتفاقية (بالعربية)")} name="bodyAr" dir="rtl" required textarea rows={22} defaultValue={contract.bodyAr} />
              </div>
              <p className="hint">
                {t(
                  "Changing the text creates a new version. Orders already placed keep the version they accepted.",
                  "تغيير النص ينشئ إصدارًا جديدًا. تحتفظ الطلبات السابقة بالإصدار الذي وافقت عليه.",
                )}
              </p>
              <SubmitButton>{t("Save agreement", "حفظ الاتفاقية")}</SubmitButton>
            </ActionForm>
          </Disclosure>
        ))}
      </div>
    </>
  );
}
