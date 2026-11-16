import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { mediaFiles, reportAttachments, reports } from "@/db/schema";
import { getAdmin, getClient } from "@/lib/auth/session";
import { isUuid } from "@/lib/format";

export const dynamic = "force-dynamic";

const CHUNK = 2 * 1024 * 1024;
const INLINE = /^(image\/|video\/|application\/pdf$)/;

/** Private files (report attachments) are only served to admins and to the client they were published for. */
async function mayRead(fileId: string): Promise<boolean> {
  if (await getAdmin()) return true;
  const client = await getClient();
  if (!client || client.status !== "active") return false;
  const [row] = await db
    .select({ id: reports.id })
    .from(reportAttachments)
    .innerJoin(reports, eq(reports.id, reportAttachments.reportId))
    .where(and(eq(reportAttachments.fileId, fileId), eq(reports.clientId, client.id), sql`${reports.publishedAt} is not null`))
    .limit(1);
  return Boolean(row);
}

/** Streams an uploaded file from PostgreSQL, with HTTP range support so videos can seek. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isUuid(id)) return new Response("Not found", { status: 404 });

    const [meta] = await db
      .select({ mimeType: mediaFiles.mimeType, size: mediaFiles.size, visibility: mediaFiles.visibility, filename: mediaFiles.filename })
      .from(mediaFiles)
      .where(eq(mediaFiles.id, id))
      .limit(1);
    if (!meta) return new Response("Not found", { status: 404 });
    if (meta.visibility !== "public" && !(await mayRead(id))) return new Response("Not found", { status: 404 });

    const headers: Record<string, string> = {
      "Content-Type": meta.mimeType,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": meta.visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
      "Content-Disposition": `${INLINE.test(meta.mimeType) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(meta.filename)}`,
    };

    const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
    if (range && (range[1] || range[2])) {
      let start: number;
      let end: number;
      if (range[1]) {
        start = Number(range[1]);
        end = range[2] ? Math.min(Number(range[2]), meta.size - 1) : Math.min(start + CHUNK - 1, meta.size - 1);
      } else {
        start = Math.max(meta.size - Number(range[2]), 0);
        end = meta.size - 1;
      }
      if (start >= meta.size || start > end) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${meta.size}` } });
      }
      end = Math.min(end, start + CHUNK - 1);
      const [part] = await db
        .select({ chunk: sql<Buffer>`substring(${mediaFiles.data} from ${start + 1} for ${end - start + 1})` })
        .from(mediaFiles)
        .where(eq(mediaFiles.id, id));
      return new Response(new Uint8Array(part.chunk), {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${meta.size}`, "Content-Length": String(end - start + 1) },
      });
    }

    const [full] = await db.select({ data: mediaFiles.data }).from(mediaFiles).where(eq(mediaFiles.id, id));
    return new Response(new Uint8Array(full.data), { headers: { ...headers, "Content-Length": String(meta.size) } });
  } catch (error) {
    console.error("[media]", error);
    return new Response("Server error", { status: 500 });
  }
}
