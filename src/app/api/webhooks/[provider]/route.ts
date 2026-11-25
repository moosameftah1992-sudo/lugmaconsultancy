import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentMethods } from "@/db/schema";
import { GATEWAYS, isGatewayKey, missingEnv } from "@/lib/payments/gateways";
import { logRejectedWebhook, processGatewayEvent } from "@/lib/payments/process";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Payment gateway webhooks: POST /api/webhooks/tap | benefit_gateway | paypal
 *
 *  - Gateway disabled in /admin           → 404 (endpoint behaves as if it did not exist)
 *  - Credentials missing on the server    → 503
 *  - Signature / decryption check fails   → 401, logged without trusting the body
 *  - Authentic event                      → processed idempotently; in mock mode the
 *                                           payment is flagged as a test and kept out of finance figures
 */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isGatewayKey(provider)) return Response.json({ error: "Unknown provider" }, { status: 404 });

  try {
    const [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.key, provider)).limit(1);
    if (!method?.isEnabled) return Response.json({ error: "Gateway disabled" }, { status: 404 });
    if (missingEnv(provider).length) return Response.json({ error: "Gateway not configured" }, { status: 503 });

    const rawBody = await req.text();
    const event = await GATEWAYS[provider].parseWebhook(rawBody, req.headers);
    if (!event) {
      await logRejectedWebhook(provider, "Signature verification failed");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const result = await processGatewayEvent({ provider, event, simulated: method.mode !== "live" });

    if (provider === "benefit_gateway") {
      // BENEFIT expects a plain-text redirect instruction for the customer's browser.
      const base = await getBaseUrl();
      return new Response(`REDIRECT=${base}/portal${result.orderId ? `/orders/${result.orderId}` : ""}`, {
        headers: { "Content-Type": "text/plain" },
      });
    }
    return Response.json({ received: true, status: result.status });
  } catch (error) {
    console.error(`[webhook:${provider}]`, error);
    await logRejectedWebhook(provider, error instanceof Error ? error.message.slice(0, 300) : "Processing error", "error").catch(() => {});
    // A 5xx asks the gateway to retry later.
    return Response.json({ error: "Processing error" }, { status: 500 });
  }
}
