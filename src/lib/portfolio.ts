import { pick } from "@/i18n";
import type { Locale, PortfolioSlide } from "@/types";
import { parseExternalUrl } from "./embed";

export interface PortfolioRow {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: string;
  sourceType: string;
  mediaKind: string;
  fileId: string | null;
  externalUrl: string | null;
  coverFileId: string | null;
}

const fileUrl = (id: string) => `/api/media/${id}`;

/** Maps a stored portfolio item (upload or external link) to what the carousel renders. */
export function toSlide(row: PortfolioRow, locale: Locale): PortfolioSlide | null {
  const base = {
    id: row.id,
    title: pick(locale, row.titleEn, row.titleAr),
    description: pick(locale, row.descriptionEn, row.descriptionAr),
    category: row.category,
  };
  const customCover = row.coverFileId ? fileUrl(row.coverFileId) : null;

  if (row.sourceType === "upload") {
    if (!row.fileId) return null;
    const kind = row.mediaKind === "video" ? "video" : "image";
    return {
      ...base,
      kind,
      src: fileUrl(row.fileId),
      cover: customCover ?? (kind === "image" ? fileUrl(row.fileId) : null),
      provider: null,
      portrait: false,
    };
  }

  const external = parseExternalUrl(row.externalUrl);
  if (!external) return null;
  return {
    ...base,
    kind: external.kind,
    src: external.src,
    cover: customCover ?? external.thumbnail,
    provider: external.provider,
    portrait: external.portrait,
  };
}
