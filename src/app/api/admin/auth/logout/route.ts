import { destroySession, isSameOrigin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    await destroySession("admin");
  } catch (error) {
    console.error("[admin logout]", error);
  }
  return Response.json({ ok: true });
}
