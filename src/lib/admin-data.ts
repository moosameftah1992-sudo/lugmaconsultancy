import { sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, inquiries, orders, payments } from "@/db/schema";

/** Items waiting for the team's attention — drives the sidebar badges and the overview. */
export async function getAttentionCounts() {
  const [[o], [c], [i], [p]] = await Promise.all([
    db
      .select({
        fresh: sql<number>`(count(*) filter (where ${orders.status} = 'new'))::int`,
        active: sql<number>`(count(*) filter (where ${orders.status} = 'active'))::int`,
      })
      .from(orders),
    db
      .select({
        pending: sql<number>`(count(*) filter (where ${clients.status} = 'pending'))::int`,
        active: sql<number>`(count(*) filter (where ${clients.status} = 'active'))::int`,
      })
      .from(clients),
    db.select({ fresh: sql<number>`(count(*) filter (where ${inquiries.status} = 'new'))::int` }).from(inquiries),
    db
      .select({
        submitted: sql<number>`(count(*) filter (where ${payments.status} = 'submitted'))::int`,
        due: sql<number>`(count(*) filter (where ${payments.status} = 'due'))::int`,
      })
      .from(payments),
  ]);
  return {
    newOrders: o?.fresh ?? 0,
    activeOrders: o?.active ?? 0,
    pendingClients: c?.pending ?? 0,
    activeClients: c?.active ?? 0,
    newInquiries: i?.fresh ?? 0,
    paymentsToConfirm: p?.submitted ?? 0,
    paymentsDue: p?.due ?? 0,
  };
}
