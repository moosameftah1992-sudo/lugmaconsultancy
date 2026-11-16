/**
 * Payment gateway adapters. Each adapter knows how to
 *   1. start a hosted checkout,
 *   2. authenticate an incoming webhook / server notification, and
 *   3. (optionally) verify a payment when the customer returns from the hosted page.
 *
 * Credentials live only in environment variables — never in the database.
 * Every gateway ships disabled and in mock mode; nothing here runs until an admin
 * enables the channel in /admin → Payment setup.
 */
import { createCipheriv, createDecipheriv, createHmac, randomInt, timingSafeEqual } from "crypto";

export const GATEWAY_KEYS = ["tap", "benefit_gateway", "paypal"] as const;
export type GatewayKey = (typeof GATEWAY_KEYS)[number];
export const isGatewayKey = (v: unknown): v is GatewayKey => GATEWAY_KEYS.includes(v as GatewayKey);

export interface GatewayEvent {
  /** Stable id used to make processing idempotent. */
  eventId: string;
  /** Our payments.id, echoed back by the gateway. */
  paymentId: string | null;
  providerRef: string | null;
  outcome: "paid" | "failed" | "ignored";
  amount: { value: number; currency: "BHD" | "USD" } | null;
  payload: unknown;
}

export interface CheckoutContext {
  paymentId: string;
  orderRef: string;
  amountBhd: string;
  description: string;
  customer: { name: string; email: string };
  /** Where the customer lands after the hosted page. */
  returnUrl: string;
  /** Server-to-server notification endpoint: /api/webhooks/<gateway>. */
  webhookUrl: string;
}

export interface Gateway {
  key: GatewayKey;
  requiredEnv: string[];
  createCheckout(ctx: CheckoutContext): Promise<{ redirectUrl: string; providerRef: string | null }>;
  /** Resolves to null when the signature / authenticity check fails. */
  parseWebhook(rawBody: string, headers: Headers): Promise<GatewayEvent | null>;
  confirmReturn?(params: URLSearchParams): Promise<GatewayEvent | null>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

const env = (name: string): string => process.env[name]?.trim() ?? "";

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/* ──────────────────────────────────── Tap ──────────────────────────────────── */

async function tapRequest(path: string, init?: RequestInit): Promise<Json> {
  const res = await fetch(`https://api.tap.company/v2${path}`, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${env("TAP_SECRET_KEY")}`, "Content-Type": "application/json", Accept: "application/json" },
  });
  const data = (await res.json().catch(() => null)) as Json | null;
  if (!res.ok || !data) throw new Error(`Tap API responded ${res.status}`);
  return data;
}

function tapEvent(charge: Json): GatewayEvent {
  const status = String(charge.status ?? "");
  const pending = ["INITIATED", "IN_PROGRESS", "AUTHORIZED"].includes(status);
  return {
    eventId: `${charge.id}:${status}`,
    paymentId: charge.reference?.transaction ?? charge.metadata?.payment_id ?? null,
    providerRef: charge.id ?? null,
    outcome: status === "CAPTURED" ? "paid" : pending ? "ignored" : "failed",
    amount: charge.currency === "BHD" ? { value: Number(charge.amount), currency: "BHD" } : null,
    payload: { id: charge.id, status, amount: charge.amount, currency: charge.currency, reference: charge.reference },
  };
}

const tap: Gateway = {
  key: "tap",
  requiredEnv: ["TAP_SECRET_KEY"],

  async createCheckout(ctx) {
    const charge = await tapRequest("/charges", {
      method: "POST",
      body: JSON.stringify({
        amount: Number(ctx.amountBhd),
        currency: "BHD",
        customer_initiated: true,
        threeDSecure: true,
        save_card: false,
        description: ctx.description,
        metadata: { payment_id: ctx.paymentId },
        reference: { transaction: ctx.paymentId, order: ctx.orderRef },
        receipt: { email: true, sms: false },
        customer: { first_name: ctx.customer.name, email: ctx.customer.email },
        source: { id: "src_all" },
        post: { url: ctx.webhookUrl },
        redirect: { url: ctx.returnUrl },
      }),
    });
    if (!charge.transaction?.url) throw new Error("Tap did not return a payment page URL");
    return { redirectUrl: charge.transaction.url, providerRef: charge.id ?? null };
  },

  async parseWebhook(rawBody, headers) {
    let body: Json;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    // Tap signs: HMAC-SHA256(secret key) over an ordered, x_-labelled field string.
    // Amounts use the currency's decimals — three for BHD.
    const decimals = ["BHD", "KWD", "OMR", "JOD"].includes(body.currency) ? 3 : 2;
    const toSign =
      `x_id${body.id}x_amount${Number(body.amount).toFixed(decimals)}x_currency${body.currency}` +
      `x_gateway_reference${body.gateway?.reference ?? ""}x_payment_reference${body.reference?.payment ?? ""}` +
      `x_status${body.status}x_created${body.transaction?.created ?? ""}`;
    const expected = createHmac("sha256", env("TAP_SECRET_KEY")).update(toSign).digest("hex");
    if (!safeEqual(expected, headers.get("hashstring") ?? "")) return null;
    // Defence in depth: act on the charge as Tap reports it now, not on the posted body.
    return tapEvent(await tapRequest(`/charges/${encodeURIComponent(body.id)}`));
  },

  async confirmReturn(params) {
    const id = params.get("tap_id");
    if (!id || !/^[\w-]+$/.test(id)) return null;
    return tapEvent(await tapRequest(`/charges/${id}`));
  },
};

/* ─────────────────────────── BENEFIT Payment Gateway ───────────────────────── */

// BENEFIT encrypts the "trandata" envelope with AES-256-CBC under the terminal
// resource key, using this fixed IV; ciphertext is upper-case hex and the plain
// text is URL-encoded. Successfully decrypting a notification authenticates it.
const BENEFIT_IV = Buffer.from("PGKEYENCDECIVSPC", "utf8");

function benefitEncrypt(plain: string): string {
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(env("BENEFIT_RESOURCE_KEY"), "utf8"), BENEFIT_IV);
  return Buffer.concat([cipher.update(encodeURIComponent(plain), "utf8"), cipher.final()]).toString("hex").toUpperCase();
}

function benefitDecrypt(hex: string): string {
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(env("BENEFIT_RESOURCE_KEY"), "utf8"), BENEFIT_IV);
  const text = Buffer.concat([decipher.update(Buffer.from(hex, "hex")), decipher.final()]).toString("utf8");
  return decodeURIComponent(text.replace(/\+/g, " "));
}

const benefitGateway: Gateway = {
  key: "benefit_gateway",
  requiredEnv: ["BENEFIT_TRANPORTAL_ID", "BENEFIT_TRANPORTAL_PASSWORD", "BENEFIT_RESOURCE_KEY"],

  async createCheckout(ctx) {
    const endpoint =
      env("BENEFIT_ENV") === "live"
        ? "https://www.benefit-gateway.bh/payment/API/hosted.htm"
        : "https://test.benefit-gateway.bh/payment/API/hosted.htm";
    const id = env("BENEFIT_TRANPORTAL_ID");
    const trandata = benefitEncrypt(
      JSON.stringify([
        {
          amt: Number(ctx.amountBhd).toFixed(3),
          action: "1",
          password: env("BENEFIT_TRANPORTAL_PASSWORD"),
          id,
          currencycode: "048",
          trackId: `${Date.now()}${randomInt(100, 999)}`,
          udf1: ctx.paymentId,
          udf2: ctx.orderRef,
          udf3: "",
          udf4: "",
          udf5: "",
          responseURL: ctx.webhookUrl,
          errorURL: ctx.returnUrl,
        },
      ]),
    );
    const res = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify([{ id, trandata }]),
    });
    const data = (await res.json().catch(() => null)) as Json[] | null;
    const first = Array.isArray(data) ? data[0] : null;
    if (!res.ok || !first || String(first.status) !== "1" || typeof first.result !== "string") {
      throw new Error(`BENEFIT gateway rejected the request (${first?.errorText ?? res.status})`);
    }
    // result = "<PaymentID>:<payment page URL>"
    const split = first.result.indexOf(":");
    const paymentId = first.result.slice(0, split);
    const page = first.result.slice(split + 1);
    return { redirectUrl: `${page}${page.includes("?") ? "&" : "?"}PaymentID=${paymentId}`, providerRef: paymentId };
  },

  async parseWebhook(rawBody) {
    let encrypted: string | null = null;
    try {
      const json = JSON.parse(rawBody) as Json | Json[];
      encrypted = (Array.isArray(json) ? json[0] : json)?.trandata ?? null;
    } catch {
      encrypted = new URLSearchParams(rawBody).get("trandata");
    }
    if (!encrypted || !/^[0-9a-fA-F]+$/.test(encrypted)) return null;

    let item: Json;
    try {
      const parsed = JSON.parse(benefitDecrypt(encrypted)) as Json | Json[];
      item = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      return null; // wrong key or tampered payload
    }
    if (!item || typeof item !== "object") return null;

    const result = String(item.result ?? "");
    const ref = String(item.paymentId ?? item.transId ?? item.trackId ?? "");
    return {
      eventId: `${ref}:${result}`,
      paymentId: typeof item.udf1 === "string" ? item.udf1 : null,
      providerRef: ref || null,
      outcome: result === "CAPTURED" ? "paid" : "failed",
      amount: item.amt != null ? { value: Number(item.amt), currency: "BHD" } : null,
      payload: { paymentId: item.paymentId, result, trackId: item.trackId, amt: item.amt, ref: item.ref, authRespCode: item.authRespCode },
    };
  },
};

/* ─────────────────────────────────── PayPal ────────────────────────────────── */

/** PayPal cannot process BHD; amounts are converted at the official peg (1 USD = 0.376 BHD). */
export function bhdToUsd(bhd: string | number): string {
  const rate = Number(process.env.PAYPAL_BHD_TO_USD) || 1 / 0.376;
  return (Number(bhd) * rate).toFixed(2);
}

const paypalBase = () => (env("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

async function paypalToken(): Promise<string> {
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env("PAYPAL_CLIENT_ID")}:${env("PAYPAL_CLIENT_SECRET")}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await res.json().catch(() => null)) as Json | null;
  if (!res.ok || !data?.access_token) throw new Error(`PayPal auth failed (${res.status})`);
  return data.access_token;
}

async function paypalRequest(path: string, method: "GET" | "POST", body?: unknown): Promise<{ status: number; data: Json | null }> {
  const res = await fetch(`${paypalBase()}${path}`, {
    method,
    cache: "no-store",
    headers: { Authorization: `Bearer ${await paypalToken()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => null)) as Json | null };
}

function paypalCaptureEvent(capture: Json | undefined, fallbackId: string): GatewayEvent {
  const status = String(capture?.status ?? "");
  return {
    eventId: `${capture?.id ?? fallbackId}:${status}`,
    paymentId: capture?.custom_id ?? null,
    providerRef: capture?.id ?? fallbackId,
    outcome: status === "COMPLETED" ? "paid" : status === "PENDING" || !status ? "ignored" : "failed",
    amount: capture?.amount?.currency_code === "USD" ? { value: Number(capture.amount.value), currency: "USD" } : null,
    payload: { id: capture?.id, status, amount: capture?.amount, custom_id: capture?.custom_id },
  };
}

const paypal: Gateway = {
  key: "paypal",
  requiredEnv: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID"],

  async createCheckout(ctx) {
    const { status, data } = await paypalRequest("/v2/checkout/orders", "POST", {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: ctx.orderRef,
          custom_id: ctx.paymentId,
          description: ctx.description.slice(0, 120),
          amount: { currency_code: "USD", value: bhdToUsd(ctx.amountBhd) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: { brand_name: "Luqma", user_action: "PAY_NOW", return_url: ctx.returnUrl, cancel_url: ctx.returnUrl },
        },
      },
    });
    const link = (data?.links as Json[] | undefined)?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (status >= 300 || !link?.href) throw new Error(`PayPal could not create the order (${status})`);
    return { redirectUrl: link.href, providerRef: data?.id ?? null };
  },

  async parseWebhook(rawBody, headers) {
    let event: Json;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const { data } = await paypalRequest("/v1/notifications/verify-webhook-signature", "POST", {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: env("PAYPAL_WEBHOOK_ID"),
      webhook_event: event,
    });
    if (data?.verification_status !== "SUCCESS") return null;

    const type = String(event.event_type ?? "");
    if (type === "PAYMENT.CAPTURE.COMPLETED") return { ...paypalCaptureEvent(event.resource, event.id), eventId: event.id };
    if (type === "PAYMENT.CAPTURE.DENIED" || type === "PAYMENT.CAPTURE.DECLINED") {
      return { ...paypalCaptureEvent({ ...event.resource, status: "DENIED" }, event.id), eventId: event.id };
    }
    return { eventId: event.id, paymentId: null, providerRef: null, outcome: "ignored", amount: null, payload: { type } };
  },

  async confirmReturn(params) {
    const orderId = params.get("token");
    if (!orderId || !/^[\w-]+$/.test(orderId)) return null;
    let { data } = await paypalRequest(`/v2/checkout/orders/${orderId}/capture`, "POST", {});
    // Already captured (e.g. the customer refreshed the return page): read the order instead.
    if (!data?.purchase_units) ({ data } = await paypalRequest(`/v2/checkout/orders/${orderId}`, "GET"));
    const capture = data?.purchase_units?.[0]?.payments?.captures?.[0] as Json | undefined;
    if (!capture) return null;
    return paypalCaptureEvent(capture, orderId);
  },
};

/* ────────────────────────────────── Registry ───────────────────────────────── */

export const GATEWAYS: Record<GatewayKey, Gateway> = { tap, benefit_gateway: benefitGateway, paypal };

/** Environment variables a gateway still needs before it can run live. */
export const missingEnv = (key: GatewayKey): string[] => GATEWAYS[key].requiredEnv.filter((name) => !env(name));
