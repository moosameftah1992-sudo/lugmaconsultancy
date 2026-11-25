import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentMethods, payments } from "@/db/schema";
import { isUuid } from "@/lib/format";
import { GATEWAYS, isGatewayKey, missingEnv } from "@/lib/payments/gateways";
import { processGatewayEvent } from "@/lib/payments/process";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Where a hosted payment page sends the customer back. The payment is verified
 * server-to-server with the gateway (never trusted from the query string), then the
 * customer lands on their order. The webhook remains the source of truth if this is skipped.
 */
async function handle(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const gateway = url.searchParams.get("gateway");
  const base = await getBaseUrl();
  let destination = `${base}/portal`;

  try {
    if (isUuid(id)) {
      const [payment] = await db.select({ orderId: payments.orderId }).from(payments).where(eq(payments.id, id)).limit(1);
      if (payment) destination = `${base}/portal/orders/${payment.orderId}`;

      if (payment && isGatewayKey(gateway)) {
        const [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.key, gateway)).limit(1);
        const confirm = GATEWAYS[gateway].confirmReturn;
        if (method?.isEnabled && method.mode === "live" && confirm && missingEnv(gateway).length === 0) {
          const event = await confirm(url.searchParams);
          if (event && event.paymentId === id) await processGatewayEvent({ provider: gateway, event, simulated: false });
        }
      }
    }
  } catch (error) {
    console.error("[payment return]", error);
  }
  return Response.redirect(destination, 303);
}

export const GET = handle;
export const POST = handle;
