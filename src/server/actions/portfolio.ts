"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { portfolioItems } from "@/db/schema";
import { parseExternalUrl } from "@/lib/embed";
import { claimMedia, deleteMedia } from "@/lib/media";
import { adminAction, flag, FormError, idList, int, oneOf, str, uuid } from "@/server/form";
import { PORTFOLIO_CATEGORIES, type ActionResult } from "@/types";

/** Creates or updates a portfolio item from either a local upload or an external embed link. */
export async function savePortfolioItem(fd: FormData): Promise<ActionResult> {
  return adminAction("portfolio", async (_admin, t) => {
    const titleEn = str(fd, "titleEn", 160);
    const titleAr = str(fd, "titleAr", 160);
    if (!titleEn && !titleAr) throw new FormError(t("Add a title in at least one language.", "أضف عنوانًا بلغة واحدة على الأقل."));

    const editing = Boolean(str(fd, "id", 40));
    const [existing] = editing ? await db.select().from(portfolioItems).where(eq(portfolioItems.id, uuid(fd, "id"))).limit(1) : [];
    if (editing && !existing) throw new FormError(t("This item no longer exists.", "هذا العمل لم يعد موجودًا."));

    const sourceType = oneOf(fd, "sourceType", ["upload", "external"] as const, "upload");
    let fileId = existing?.fileId ?? null;
    let externalUrl: string | null = null;
    let embedProvider: string | null = null;
    let mediaKind = existing?.mediaKind ?? "image";

    if (sourceType === "external") {
      const url = str(fd, "externalUrl", 600);
      const parsed = parseExternalUrl(url);
      if (!parsed) {
        throw new FormError(
          t(
            "This link is not supported. Paste an Instagram reel or post, a YouTube, Vimeo or TikTok video, or a direct https link to an image or video file.",
            "هذا الرابط غير مدعوم. الصق رابط ريل أو منشور من إنستغرام، أو فيديو من يوتيوب أو فيميو أو تيك توك، أو رابط https مباشرًا لملف صورة أو فيديو.",
          ),
        );
      }
      externalUrl = url;
      embedProvider = parsed.provider;
      mediaKind = parsed.kind;
      fileId = null;
    } else {
      const [media] = await claimMedia(idList(fd, "mediaIds"), ["portfolio"]);
      if (media) {
        fileId = media.id;
        mediaKind = media.mimeType.startsWith("video/") ? "video" : "image";
      } else if (!(existing?.sourceType === "upload" && existing.fileId)) {
        throw new FormError(t("Choose an image or video file to upload.", "اختر ملف صورة أو فيديو لرفعه."));
      }
    }

    const [cover] = await claimMedia(idList(fd, "coverIds"), ["cover"]);
    const coverFileId = cover ? cover.id : flag(fd, "removeCover") ? null : (existing?.coverFileId ?? null);

    const values = {
      titleEn,
      titleAr,
      descriptionEn: str(fd, "descriptionEn", 600),
      descriptionAr: str(fd, "descriptionAr", 600),
      category: oneOf(fd, "category", PORTFOLIO_CATEGORIES, "other"),
      sourceType,
      mediaKind,
      fileId,
      externalUrl,
      embedProvider,
      coverFileId,
      isPublished: flag(fd, "isPublished"),
      sortOrder: int(fd, "sortOrder", 0, 9999, 0),
    };

    if (existing) {
      await db.update(portfolioItems).set(values).where(eq(portfolioItems.id, existing.id));
      await deleteMedia([
        existing.fileId !== fileId ? existing.fileId : null,
        existing.coverFileId !== coverFileId ? existing.coverFileId : null,
      ]);
    } else {
      await db.insert(portfolioItems).values(values);
    }
    return { ok: true, message: t("Portfolio item saved.", "تم حفظ العمل.") };
  });
}

export async function deletePortfolioItem(fd: FormData): Promise<ActionResult> {
  return adminAction("portfolio", async (_admin, t) => {
    const [row] = await db.delete(portfolioItems).where(eq(portfolioItems.id, uuid(fd, "id"))).returning();
    if (row) await deleteMedia([row.fileId, row.coverFileId]);
    return { ok: true, message: t("Portfolio item deleted.", "تم حذف العمل.") };
  });
}

export async function setPortfolioPublished(fd: FormData): Promise<ActionResult> {
  return adminAction("portfolio", async () => {
    await db.update(portfolioItems).set({ isPublished: flag(fd, "published") }).where(eq(portfolioItems.id, uuid(fd, "id")));
  });
}
