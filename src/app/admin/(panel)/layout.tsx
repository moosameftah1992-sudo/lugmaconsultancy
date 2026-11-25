import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAttentionCounts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  // Every page below also calls requireAdmin(permission) itself — the layout is not the only gate.
  const admin = await requireAdmin();
  const counts = await getAttentionCounts();
  return (
    <AdminShell
      admin={{ name: admin.name, isMaster: admin.isMaster }}
      allowed={admin.permissions}
      counts={{ orders: counts.newOrders + counts.paymentsToConfirm, clients: counts.pendingClients, inquiries: counts.newInquiries }}
    >
      {children}
    </AdminShell>
  );
}
