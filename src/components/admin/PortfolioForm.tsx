"use client";

import { CircleAlert, CircleCheck, Link2, Upload } from "lucide-react";
import { useId, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { bi } from "@/i18n";
import { useT } from "@/i18n/client";
import { parseExternalUrl, PROVIDER_NAMES } from "@/lib/embed";
import { savePortfolioItem } from "@/server/actions/portfolio";
import { LABELS, PORTFOLIO_CATEGORIES } from "@/types";

export interface PortfolioInitial {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: string;
  sourceType: "upload" | "external";
  externalUrl: string;
  isPublished: boolean;
  sortOrder: number;
  hasFile: boolean;
  hasCover: boolean;
}

/**
 * Add / edit a portfolio item with either input method:
 *   a) a file picked from the local device (image or video), or
 *   b) an external link that is embedded and played inside the platform.
 */
export function PortfolioForm({ initial, maxMb }: { initial?: PortfolioInitial; maxMb: number }) {
  const t = useT();
  const uid = useId();
  const [source, setSource] = useState<"upload" | "external">(initial?.sourceType ?? "upload");
  const [url, setUrl] = useState(initial?.externalUrl ?? "");
  const parsed = url.trim() ? parseExternalUrl(url) : null;

  const tab = (value: "upload" | "external", Icon: typeof Upload, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={source === value}
      onClick={() => setSource(value)}
      className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
        source === value ? "bg-white text-navy-900 shadow-sm" : "text-navy-600 hover:text-navy-900"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <ActionForm action={savePortfolioItem} resetOnSuccess={!initial} className="space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="sourceType" value={source} />

      <div>
        <p className="label" id={`${uid}-source`}>
          {t("Media source", "مصدر الوسائط")}
        </p>
        <div role="radiogroup" aria-labelledby={`${uid}-source`} className="flex gap-1 rounded-xl bg-navy-50 p-1">
          {tab("upload", Upload, t("Upload a file", "رفع ملف"))}
          {tab("external", Link2, t("External link", "رابط خارجي"))}
        </div>
      </div>

      {source === "upload" ? (
        <div>
          <label htmlFor={`${uid}-file`} className="label">
            {initial?.hasFile ? t("Replace the image or video (optional)", "استبدال الصورة أو الفيديو (اختياري)") : t("Image or video file", "ملف صورة أو فيديو")}
          </label>
          <input
            id={`${uid}-file`}
            type="file"
            name="media"
            data-upload="portfolio"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
            className="input file:me-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white"
          />
          <p className="hint">
            {t(`JPG, PNG, WebP, GIF, AVIF, MP4, WebM or MOV — up to ${maxMb} MB.`, `JPG أو PNG أو WebP أو GIF أو AVIF أو MP4 أو WebM أو MOV — حتى ${maxMb} ميغابايت.`)}
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor={`${uid}-url`} className="label">
            {t("Link to embed", "الرابط المراد تضمينه")}
          </label>
          <input
            id={`${uid}-url`}
            name="externalUrl"
            type="url"
            dir="ltr"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/…"
            className="input"
          />
          {url.trim() ? (
            parsed ? (
              <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-emerald-700">
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t(
                  `${PROVIDER_NAMES[parsed.provider]} recognised — it will open and play inside the site, without redirecting visitors.`,
                  `تم التعرّف على ${PROVIDER_NAMES[parsed.provider]} — سيُفتح ويُعرض داخل الموقع دون تحويل الزوار.`,
                )}
              </p>
            ) : (
              <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-red-700">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t(
                  "Not recognised yet. Use an Instagram reel or post, YouTube, Vimeo or TikTok link, or a direct https link to an image or video file.",
                  "لم يتم التعرّف على الرابط. استخدم رابط ريل أو منشور إنستغرام، أو يوتيوب أو فيميو أو تيك توك، أو رابط https مباشرًا لملف صورة أو فيديو.",
                )}
              </p>
            )
          ) : (
            <p className="hint">
              {t("Instagram reels and posts, YouTube, Vimeo, TikTok, or a direct image / video URL.", "ريلز ومنشورات إنستغرام، يوتيوب، فيميو، تيك توك، أو رابط مباشر لصورة أو فيديو.")}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-ten`} className="label">
            {t("Title (English)", "العنوان (بالإنجليزية)")}
          </label>
          <input id={`${uid}-ten`} name="titleEn" dir="ltr" maxLength={160} defaultValue={initial?.titleEn} className="input" />
        </div>
        <div>
          <label htmlFor={`${uid}-tar`} className="label">
            {t("Title (Arabic)", "العنوان (بالعربية)")}
          </label>
          <input id={`${uid}-tar`} name="titleAr" dir="rtl" maxLength={160} defaultValue={initial?.titleAr} className="input" />
        </div>
        <div>
          <label htmlFor={`${uid}-den`} className="label">
            {t("Short description (English)", "وصف قصير (بالإنجليزية)")}
          </label>
          <textarea id={`${uid}-den`} name="descriptionEn" dir="ltr" rows={2} maxLength={600} defaultValue={initial?.descriptionEn} className="input" />
        </div>
        <div>
          <label htmlFor={`${uid}-dar`} className="label">
            {t("Short description (Arabic)", "وصف قصير (بالعربية)")}
          </label>
          <textarea id={`${uid}-dar`} name="descriptionAr" dir="rtl" rows={2} maxLength={600} defaultValue={initial?.descriptionAr} className="input" />
        </div>
        <div>
          <label htmlFor={`${uid}-cat`} className="label">
            {t("Category", "التصنيف")}
          </label>
          <select id={`${uid}-cat`} name="category" defaultValue={initial?.category ?? "content"} className="input">
            {PORTFOLIO_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {bi(t, LABELS.portfolioCategory[c])}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-sort`} className="label">
            {t("Position in the carousel", "الترتيب في المعرض")}
          </label>
          <input id={`${uid}-sort`} name="sortOrder" type="number" min={0} max={9999} defaultValue={initial?.sortOrder ?? 0} className="input" />
          <p className="hint">{t("Lower numbers appear first.", "الأرقام الأصغر تظهر أولًا.")}</p>
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-cover`} className="label">
          {t("Cover image (optional)", "صورة الغلاف (اختياري)")}
        </label>
        <input
          id={`${uid}-cover`}
          type="file"
          name="cover"
          data-upload="cover"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="input file:me-3 file:rounded-full file:border-0 file:bg-navy-100 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-navy-900"
        />
        <p className="hint">
          {t(
            "Shown on the carousel card. Recommended for Instagram, TikTok and Vimeo links, which do not provide a thumbnail.",
            "تظهر على بطاقة المعرض. يُنصح بها لروابط إنستغرام وتيك توك وفيميو لأنها لا توفّر صورة مصغّرة.",
          )}
        </p>
        {initial?.hasCover && (
          <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm text-navy-800">
            <input type="checkbox" name="removeCover" className="check" />
            {t("Remove the current cover", "إزالة الغلاف الحالي")}
          </label>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-800">
        <input type="checkbox" name="isPublished" defaultChecked={initial?.isPublished ?? true} className="check" />
        {t("Show on the public home page", "عرضه في الصفحة الرئيسية العامة")}
      </label>

      <SubmitButton>{initial ? t("Save changes", "حفظ التغييرات") : t("Add to portfolio", "إضافة إلى المعرض")}</SubmitButton>
    </ActionForm>
  );
}
