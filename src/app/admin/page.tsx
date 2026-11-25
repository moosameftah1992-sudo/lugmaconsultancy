import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ensureBootstrap } from "@/db/bootstrap";
import { getAdmin } from "@/lib/auth/session";

/** /admin — the only entrance to the management panel. Shows the sign-in form until authenticated. */
export default async function AdminEntryPage() {
  await ensureBootstrap();
  if (await getAdmin()) redirect("/admin/overview");
  return <AdminLogin />;
}
