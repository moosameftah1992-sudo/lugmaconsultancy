import { getT } from "@/i18n/server";
import { can, getAdmin, isSameOrigin } from "@/lib/auth/session";
import { isUploadPurpose, mediaUrl, storeUpload, UploadError, type UploadPurpose } from "@/lib/media";
import type { Permission } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Which admin permission is needed to upload for each purpose. */
const REQUIRED: Record<UploadPurpose, Permission> = {
  portfolio: "portfolio",
  cover: "portfolio",
  qr: "payments",
  report: "orders",
};

/** Admin-only upload endpoint: stores a file picked from the local device and returns its id. */
export async function POST(req: Request) {
  const t = await getT();
  try {
    if (!isSameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const admin = await getAdmin();
    if (!admin) return Response.json({ error: t("Your session has expired. Please sign in again.", "انتهت جلستك. يرجى تسجيل الدخول من جديد.") }, { status: 401 });

    const form = await req.formData();
    const purpose = form.get("purpose");
    const file = form.get("file");
    if (!isUploadPurpose(purpose) || !(file instanceof File)) {
      return Response.json({ error: t("No file was received.", "لم يتم استلام أي ملف.") }, { status: 400 });
    }
    if (!can(admin, REQUIRED[purpose])) {
      return Response.json({ error: t("You do not have permission to do this.", "ليست لديك صلاحية لتنفيذ هذا الإجراء.") }, { status: 403 });
    }

    const stored = await storeUpload(file, purpose);
    return Response.json({ id: stored.id, url: mediaUrl(stored.id), mimeType: stored.mimeType, size: stored.size, filename: stored.filename });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: 400 });
    console.error("[upload]", error);
    return Response.json({ error: t("The upload failed. Please try again.", "فشل الرفع. يرجى المحاولة مجددًا.") }, { status: 500 });
  }
}
