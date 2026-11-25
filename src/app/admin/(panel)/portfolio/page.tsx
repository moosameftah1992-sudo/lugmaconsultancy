import { asc, desc } from "drizzle-orm";
import { Disclosure, Empty, PageHeader, Panel } from "@/components/admin/parts";
import { PortfolioForm } from "@/components/admin/PortfolioForm";
import { ActionButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { portfolioItems } from "@/db/schema";
import { bi, makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { PROVIDER_NAMES, type EmbedProvider } from "@/lib/embed";
import { maxUploadMb } from "@/lib/media";
import { toSlide } from "@/lib/portfolio";
import { deletePortfolioItem, setPortfolioPublished } from "@/server/actions/portfolio";
import { biLabel } from "@/types";

export default async function PortfolioAdminPage() {
  await requireAdmin("portfolio");
  const locale = await getLocale();
  const t = makeT(locale);
  const maxMb = maxUploadMb();
  const rows = await db.select().from(portfolioItems).orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.createdAt));

  return (
    <>
      <PageHeader
        title={t("Portfolio & media", "معرض الأعمال والوسائط")}
        description={t(
          "Items published here rotate in the home-page showcase every 3 seconds. Upload files from your device or embed external links such as Instagram reels.",
          "الأعمال المنشورة هنا تتناوب في معرض الصفحة الرئيسية كل 3 ثوانٍ. ارفع ملفات من جهازك أو ضمّن روابط خارجية مثل ريلز إنستغرام.",
        )}
      />

      <Panel title={t("Add a portfolio item", "إضافة عمل إلى المعرض")}>
        <PortfolioForm maxMb={maxMb} />
      </Panel>

      <h2 className="mt-10 mb-4 text-lg font-semibold text-navy-900">
        {t("Showcase items", "أعمال المعرض")} <span className="text-muted tabular-nums">({rows.length})</span>
      </h2>

      {rows.length === 0 ? (
        <Empty
          title={t("The showcase is empty", "المعرض فارغ")}
          body={t("Add your first reel, video or image above. The public home page shows a placeholder until then.", "أضف أول ريل أو فيديو أو صورة من الأعلى. تعرض الصفحة الرئيسية رسالة مؤقتة إلى ذلك الحين.")}
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {rows.map((row) => {
            const slide = toSlide(row, locale);
            const source = row.sourceType === "upload" ? t("Uploaded file", "ملف مرفوع") : (PROVIDER_NAMES[row.embedProvider as EmbedProvider] ?? t("External link", "رابط خارجي"));
            return (
              <li key={row.id} className="card overflow-hidden">
                <div className="flex gap-4 p-4">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-navy-900">
                    {slide?.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slide.cover} alt="" loading="lazy" className="size-full object-cover" />
                    ) : slide?.kind === "video" ? (
                      <video src={`${slide.src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
                    ) : (
                      <span dir="ltr" className="grid size-full place-items-center px-1 text-center text-xs font-medium text-white/70">
                        {source}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy-900">{pick(locale, row.titleEn, row.titleAr)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={row.isPublished ? "green" : "neutral"}>{row.isPublished ? t("Published", "منشور") : t("Hidden", "مخفي")}</Badge>
                      <Badge tone="blue">{source}</Badge>
                      <Badge>{bi(t, biLabel("portfolioCategory", row.category))}</Badge>
                    </div>
                    {!slide && (
                      <p className="mt-2 text-[13px] text-red-700">{t("The media for this item is missing — edit it to fix.", "وسائط هذا العمل مفقودة — عدّله لإصلاحه.")}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton action={setPortfolioPublished} fields={{ id: row.id, published: row.isPublished ? "0" : "1" }}>
                        {row.isPublished ? t("Hide", "إخفاء") : t("Publish", "نشر")}
                      </ActionButton>
                      <ActionButton
                        action={deletePortfolioItem}
                        fields={{ id: row.id }}
                        className="btn btn-danger btn-sm"
                        confirm={t("Delete this portfolio item and its files? This cannot be undone.", "حذف هذا العمل وملفاته؟ لا يمكن التراجع عن ذلك.")}
                      >
                        {t("Delete", "حذف")}
                      </ActionButton>
                    </div>
                  </div>
                </div>
                <div className="border-t border-line p-3">
                  <Disclosure summary={t("Edit item", "تعديل العمل")}>
                    <PortfolioForm
                      maxMb={maxMb}
                      initial={{
                        id: row.id,
                        titleEn: row.titleEn,
                        titleAr: row.titleAr,
                        descriptionEn: row.descriptionEn,
                        descriptionAr: row.descriptionAr,
                        category: row.category,
                        sourceType: row.sourceType === "external" ? "external" : "upload",
                        externalUrl: row.externalUrl ?? "",
                        isPublished: row.isPublished,
                        sortOrder: row.sortOrder,
                        hasFile: Boolean(row.fileId),
                        hasCover: Boolean(row.coverFileId),
                      }}
                    />
                  </Disclosure>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
