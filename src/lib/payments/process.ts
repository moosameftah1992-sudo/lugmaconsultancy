import { randomUUID } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { payments, webhookEvents } from "@/db/schema";
import { isUuid } from "@/lib/format";
import { notifyPaymentConfirmed } from "@/lib/notifications";
import { bhdToUsd, type GatewayEvent, type GatewayKey } from "./gateways";

const OPEN_STATUSES = ["due", "submitted", "failed"];

/**
 * Marks an invoice as paid exactly once and e-mails the client a confirmation.
 * Returns false when the payment was already settled or cancelled.
 */
export async function settlePayment(
  paymentId: string,
  opts: { methodKey?: string; providerRef?: string | null; simulated?: boolean; note?: string | null } = {},
): Promise<boolean> {
  const [row] = await db
    .update(payments)
    .set({
      status: "paid",
      paidAt: new Date(),
      isSimulated: Boolean(opts.simulated),
      ...(opts.methodKey ? { methodKey: opts.methodKey } : {}),
      ...(opts.providerRef ? { providerRef: opts.providerRef } : {}),
      ...(opts.note !== undefined ? { note: opts.note } : {}),
    })
    .where(and(eq(payments.id, paymentId), inArray(payments.status, OPEN_STATUSES)))
    .returning({ id: payments.id });
  if (!row) return false;
  await notifyPaymentConfirmed(paymentId);
  return true;
}

function amountMatches(event: GatewayEvent, expectedBhd: string): boolean {
  if (!event.amount) return true;
  if (event.amount.currency === "USD") return Math.abs(event.amount.value - Number(bhdToUsd(expectedBhd))) < 0.01;
  return Math.abs(event.amount.value - Number(expectedBhd)) < 0.001;
}

export interface ProcessResult {
  status: "processed" | "duplicate" | "ignored" | "error";
  message: string;
  orderId: string | null;
}

/**
 * Single pipeline for every authenticated gateway event — real webhooks, customer
 * returns from hosted pages, and admin simulations all end up here.
 * Idempotent on (provider, eventId).
 */
export async function processGatewayEvent(input: {
  provider: GatewayKey;
  event: GatewayEvent;
  simulated: boolean;
}): Promise<ProcessResult> {
  const { provider, event, simulated } = input;
  const paymentId = isUuid(event.paymentId) ? event.paymentId : null;

  const [log] = await db
    .insert(webhookEvents)
    .values({ provider, eventId: event.eventId, signatureValid: true, simulated, paymentId, payload: event.payload ?? null })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  const [payment] = paymentId ? await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1) : [];
  const orderId = payment?.orderId ?? null;
  if (!log) return { status: "duplicate", message: "Event already processed", orderId };

  const finish = async (status: ProcessResult["status"], message: string): Promise<ProcessResult> => {
    await db.update(webhookEvents).set({ status, message }).where(eq(webhookEvents.id, log.id));
    return { status, message, orderId };
  };

  if (event.outcome === "ignored") return finish("ignored", "Event type does not change a payment");
  if (!payment) return finish("ignored", "No matching payment for this event");
  if (!amountMatches(event, payment.amountBhd)) return finish("error", "Amount does not match the invoice — payment left untouched");

  if (event.outcome === "paid") {
    const settled = await settlePayment(payment.id, { methodKey: provider, providerRef: event.providerRef, simulated });
    return finish("processed", settled ? "Payment marked as paid" : "Payment was already settled");
  }

  await db
    .update(payments)
    .set({ status: "failed", methodKey: provider, providerRef: event.providerRef })
    .where(and(eq(payments.id, payment.id), inArray(payments.status, ["due", "submitted"])));
  return finish("processed", "Payment marked as failed");
}

/** Builds a synthetic event for mock-mode checkouts and the admin "send test event" tool. */
export function simulatedEvent(paymentId: string, outcome: "paid" | "failed"): GatewayEvent {
  const id = `sim_${randomUUID()}`;
  return { eventId: id, paymentId, providerRef: id, outcome, amount: null, payload: { simulated: true, outcome } };
}

/** Records a webhook that failed authentication, without trusting or storing its body. */
export async function logRejectedWebhook(provider: string, message: string, status: "rejected" | "error" = "rejected") {
  await db
    .insert(webhookEvents)
    .values({ provider, eventId: `rejected_${randomUUID()}`, signatureValid: false, status, message })
    .onConflictDoNothing();
}
