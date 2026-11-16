import { desc } from "drizzle-orm";
import { Empty, PageHeader } from "@/components/admin/parts";
import { ActionButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { listServices } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { deleteInquiry, setInquiryStatus } from "@/server/actions/admin-misc";

export default async function InquiriesAdminPage() {
  await requireAdmin("inquiries");
  const locale = await getLocale();
  const t = makeT(locale);
  const [rows, services] = await Promise.all([db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(200), listServices(false)]);
  const serviceTitle = new Map(services.map((s) => [s.slug, pick(locale, s.titleEn, s.titleAr)]));

  return (
    <>
      <PageHeader
        title={t("Inquiries", "الاستفسارات")}
        description={t("Messages sent from the “Book a consultation” form on the website.", "الرسائل المرسلة من نموذج «احجز استشارة» في الموقع.")}
      />
      {rows.length === 0 ? (
        <Empty title={t("No inquiries yet", "لا توجد استفسارات بعد")} body={t("New messages from the website appear here.", "تظهر هنا الرسائل الجديدة من الموقع.")} />
      ) : (
        <ul className="space-y-4">
          {rows.map((q) => (
            <li key={q.id} className={`card p-5 ${q.status === "new" ? "border-amber-300" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-navy-900">
                    {q.name}
                    {q.business && <span className="font-normal text-muted">· {q.business}</span>}
                    <Badge status={q.status === "new" ? "new" : "handled"}>{q.status === "new" ? t("New", "جديد") : t("Handled", "تمت المعالجة")}</Badge>
                  </p>
                  <p className="mt-1 text-sm">
                    <a href={`mailto:${q.email}`} dir="ltr" className="text-emerald-700 hover:underline">
                      {q.email}
                    </a>
                    {q.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${q.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="text-emerald-700 hover:underline">
                          {q.phone}
                        </a>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {formatDateTime(q.createdAt, locale)}
                    {q.serviceSlug && serviceTitle.get(q.serviceSlug) ? ` · ${serviceTitle.get(q.serviceSlug)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton action={setInquiryStatus} fields={{ id: q.id, status: q.status === "new" ? "handled" : "new" }}>
                    {q.status === "new" ? t("Mark as handled", "تحديد كمعالَج") : t("Reopen", "إعادة الفتح")}
                  </ActionButton>
                  <ActionButton action={deleteInquiry} fields={{ id: q.id }} className="btn btn-danger btn-sm" confirm={t("Delete this inquiry?", "حذف هذا الاستفسار؟")}>
                    {t("Delete", "حذف")}
                  </ActionButton>
                </div>
              </div>
              <p className="prose-plain mt-4 border-t border-line pt-4" dir="auto">
                {q.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
