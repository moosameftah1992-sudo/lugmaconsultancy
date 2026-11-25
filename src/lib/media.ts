import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { mediaFiles } from "@/db/schema";
import { isUuid } from "./format";

export type UploadPurpose = "portfolio" | "cover" | "qr" | "report";

const IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VIDEOS = ["video/mp4", "video/webm", "video/quicktime"];
const DOCUMENTS = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

/** Allowed file types per upload purpose. SVG and HTML are never accepted (script injection). */
const RULES: Record<UploadPurpose, { mimes: string[]; visibility: "public" | "private" }> = {
  portfolio: { mimes: [...IMAGES, ...VIDEOS], visibility: "public" },
  cover: { mimes: IMAGES, visibility: "public" },
  qr: { mimes: IMAGES, visibility: "public" },
  report: { mimes: [...IMAGES, ...VIDEOS, ...DOCUMENTS], visibility: "private" },
};

export const isUploadPurpose = (v: unknown): v is UploadPurpose =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(RULES, v);

export const maxUploadMb = (): number => {
  const n = Number(process.env.MAX_UPLOAD_MB);
  return Number.isFinite(n) && n > 0 ? n : 40;
};

export const mediaUrl = (id: string): string => `/api/media/${id}`;

export class UploadError extends Error {}

export async function storeUpload(file: File, purpose: UploadPurpose) {
  const rule = RULES[purpose];
  const limit = maxUploadMb();
  if (!file.size) throw new UploadError("The file is empty.");
  if (file.size > limit * 1024 * 1024) throw new UploadError(`The file is larger than the ${limit} MB limit.`);
  const mime = file.type.toLowerCase();
  if (!rule.mimes.includes(mime)) throw new UploadError(`This file type (${mime || "unknown"}) is not allowed here.`);

  const [row] = await db
    .insert(mediaFiles)
    .values({
      filename: (file.name || "file").replace(/[^\w.\- ()\u0600-\u06FF]/g, "_").slice(0, 160),
      mimeType: mime,
      size: file.size,
      purpose,
      visibility: rule.visibility,
      data: Buffer.from(await file.arrayBuffer()),
    })
    .returning({ id: mediaFiles.id, mimeType: mediaFiles.mimeType, size: mediaFiles.size, filename: mediaFiles.filename });

  // Sweep uploads that were never attached to a record (abandoned forms).
  await db
    .delete(mediaFiles)
    .where(and(eq(mediaFiles.attached, false), lt(mediaFiles.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));

  return row;
}

/** Validates uploaded file ids for a purpose and marks them as referenced. */
export async function claimMedia(ids: string[], purposes: UploadPurpose[]) {
  const valid = ids.filter(isUuid);
  if (!valid.length) return [];
  const rows = await db
    .update(mediaFiles)
    .set({ attached: true })
    .where(and(inArray(mediaFiles.id, valid), inArray(mediaFiles.purpose, purposes)))
    .returning({ id: mediaFiles.id, mimeType: mediaFiles.mimeType, filename: mediaFiles.filename });
  return valid.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => Boolean(r));
}

export async function deleteMedia(ids: Array<string | null | undefined>): Promise<void> {
  const valid = ids.filter(isUuid);
  if (valid.length) await db.delete(mediaFiles).where(inArray(mediaFiles.id, valid));
}
