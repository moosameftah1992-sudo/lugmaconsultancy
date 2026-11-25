import { pushToOpsHub } from "@/lib/ops-bridge";
"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contracts, orders, packages, payments, services } from "@/db/schema";
import { pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { listCheckoutMethods } from "@/lib/data";
import { notifyTeam } from "@/lib/email";
import { formatBhd, orderRef } from "@/lib/format";
import { GATEWAYS, isGatewayKey } from "@/lib/payments/gateways";
import { processGatewayEvent, simulatedEvent } from "@/lib/payments/process";
import { getBaseUrl } from "@/lib/site";
import { clientAction, flag, FormError, oneOf, str, uuid } from "@/server/form";
import type { ActionResult, ClientUser } from "@/types";

const PAYABLE = ["due", "failed"];

/** Loads an invoice only if it belongs to the signed-in client and can still be paid. */
async function payableInvoice(fd: FormData, client: ClientUser) {
  const [row] = await db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(and(eq(payments.id, uuid(fd, "paymentId")), eq(payments.clientId, client.id), inArray(payments.status, PAYABLE)))
    .limit(1);
  return row ?? null;
}

/** Checkout: the client requests a service, accepts its SLA and (if priced) gets an invoice. */
export async function createOrder(fd: FormData): Promise<ActionResult> {
  return clientAction(async (client, t) => {
    const locale = await getLocale();
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.slug, str(fd, "service", 60)), eq(services.isActive, true)))
      .limit(1);
    if (!service) throw new FormError(t("This service is not available right now.", "هذه الخدمة غير متاحة حاليًا."));

    const packageId = str(fd, "packageId", 40);
    const [pkg] = packageId
      ? await db
          .select()
          .from(packages)
          .where(and(eq(packages.id, uuid(fd, "packageId")), eq(packages.serviceId, service.id), eq(packages.isActive, true)))
          .limit(1)
      : [];
    if (packageId && !pkg) throw new FormError(t("This package is no longer offered. Please choose another.", "هذه الباقة لم تعد متاحة. يرجى اختيار باقة أخرى."));

    if (!flag(fd, "accept")) {
      throw new FormError(t("Please read and accept the service agreement to continue.", "يرجى قراءة اتفاقية الخدمة والموافقة عليها للمتابعة."));
    }
    const [contract] = await db.select().from(contracts).where(eq(contracts.serviceId, service.id)).limit(1);

    // The payment channel must still be enabled at the moment of submission.
    const methodKey = str(fd, "methodKey", 30);
    const methods = await listCheckoutMethods(locale);
    if (methodKey && !methods.some((m) => m.key === methodKey)) {
      throw new FormError(t("That payment method is no longer available. Please choose another.", "وسيلة الدفع هذه لم تعد متاحة. يرجى اختيار وسيلة أخرى."));
    }

    const [order] = await db
      .insert(orders)
      .values({
        clientId: client.id,
        serviceId: service.id,
        packageId: pkg?.id ?? null,
        packageName: pkg ? pkg.nameEn || pkg.nameAr : "",
        amountBhd: pkg?.priceBhd ?? null,
        billingCycle: pkg?.billingCycle ?? "one_time",
        clientNotes: str(fd, "notes", 2000),
        contractVersion: contract?.version ?? null,
        contractSnapshot: contract ? pick(locale, contract.bodyEn, contract.bodyAr) : null,
        contractAcceptedAt: new Date(),
      })
      .returning({ id: orders.id, number: orders.number });

    if (pkg && Number(pkg.priceBhd) > 0) {
      await db.insert(payments).values({
        orderId: order.id,
        clientId: client.id,
        label: pkg.nameEn || pkg.nameAr,
        amountBhd: pkg.priceBhd,
        methodKey: methodKey || null,
      });
    }

    await notifyTeam(
      `New service request ${orderRef(order.number)}`,
      [
        `${client.name}${client.businessName ? ` (${client.businessName})` : ""} — ${client.email}`,
        `${service.titleEn}${pkg ? ` · ${pkg.nameEn} · ${formatBhd(pkg.priceBhd, "en")}` : " · quote requested"}`,
      ],
      `${await getBaseUrl()}/admin/orders/${order.id}`,
    );
    await pushToOpsHub({
      businessName: client.businessName || client.name,
      contactName: client.name,
      phone: client.phone || "",
      email: client.email,
      pillarSlug: service.slug,
      tierName: pkg ? pick(locale, pkg.nameEn, pkg.nameAr) : undefined,
      notes: str(fd, "notes", 2000) || `Portal Order Ref: ${orderRef(order.number)}`,
    });

    return { ok: true, redirect: `/portal/orders/${order.id}` };
  });
}

/** Manual channels (BenefitPay QR, bank transfer, cash): the client reports the payment for confirmation. */
export async function submitManualPayment(fd: FormData): Promise<ActionResult> {
  return clientAction(async (client, t) => {
    const invoice = await payableInvoice(fd, client);
    if (!invoice) throw new FormError(t("This invoice can no longer be paid.", "لم يعد بالإمكان دفع هذه الفاتورة."));
    const methodKey = str(fd, "methodKey", 30);
    const method = (await listCheckoutMethods(await getLocale())).find((m) => m.key === methodKey && m.type === "manual");
    if (!method) throw new FormError(t("That payment method is no longer available. Please choose another.", "وسيلة الدفع هذه لم تعد متاحة. يرجى اختيار وسيلة أخرى."));

    const reference = str(fd, "reference", 80);
    if (methodKey !== "cash" && reference.length < 4) {
      throw new FormError(t("Enter the transaction reference from your payment receipt.", "أدخل الرقم المرجعي للعملية من إيصال الدفع."));
    }
    await db
      .update(payments)
      .set({ status: "submitted", methodKey, clientReference: reference || null })
      .where(eq(payments.id, invoice.payment.id));
    await notifyTeam(`Payment reported for ${orderRef(invoice.order.number)}`, [
      `${client.name} reported ${formatBhd(invoice.payment.amountBhd, "en")} via ${methodKey}${reference ? ` (ref ${reference})` : ""}.`,
    ]);
    return { ok: true, message: t("Thank you — we will confirm your payment shortly.", "شكرًا لك — سنؤكد دفعتك قريبًا.") };
  });
}

/** Gateways: hands the client over to the hosted payment page (or the test page in mock mode). */
export async function startGatewayPayment(fd: FormData): Promise<ActionResult> {
  return clientAction(async (client, t) => {
    const invoice = await payableInvoice(fd, client);
    if (!invoice) throw new FormError(t("This invoice can no longer be paid.", "لم يعد بالإمكان دفع هذه الفاتورة."));
    const methodKey = str(fd, "methodKey", 30);
    const method = (await listCheckoutMethods(await getLocale())).find((m) => m.key === methodKey && m.type === "gateway");
    if (!method || !isGatewayKey(methodKey)) {
      throw new FormError(t("That payment method is no longer available. Please choose another.", "وسيلة الدفع هذه لم تعد متاحة. يرجى اختيار وسيلة أخرى."));
    }

    if (method.mode === "mock") {
      return { ok: true, redirect: `/portal/mock-checkout/${invoice.payment.id}?method=${methodKey}` };
    }

    const base = await getBaseUrl();
    try {
      const checkout = await GATEWAYS[methodKey].createCheckout({
        paymentId: invoice.payment.id,
        orderRef: orderRef(invoice.order.number),
        amountBhd: invoice.payment.amountBhd,
        description: `Luqma ${orderRef(invoice.order.number)}${invoice.payment.label ? ` — ${invoice.payment.label}` : ""}`,
        customer: { name: client.name, email: client.email },
        returnUrl: `${base}/api/portal/payments/${invoice.payment.id}/return?gateway=${methodKey}`,
        webhookUrl: `${base}/api/webhooks/${methodKey}`,
      });
      await db.update(payments).set({ methodKey, providerRef: checkout.providerRef }).where(eq(payments.id, invoice.payment.id));
      return { ok: true, redirect: checkout.redirectUrl };
    } catch (error) {
      console.error(`[payments] ${methodKey} checkout failed`, error);
      throw new FormError(
        t("We could not reach the payment provider. Please try again or choose another method.", "تعذّر الاتصال بمزوّد الدفع. يرجى المحاولة مجددًا أو اختيار وسيلة أخرى."),
      );
    }
  });
}

/** Mock mode only: completes a test checkout through the same pipeline a real webhook uses. */
export async function completeMockPayment(fd: FormData): Promise<ActionResult> {
  return clientAction(async (client, t) => {
    const invoice = await payableInvoice(fd, client);
    if (!invoice) throw new FormError(t("This invoice can no longer be paid.", "لم يعد بالإمكان دفع هذه الفاتورة."));
    const methodKey = str(fd, "methodKey", 30);
    const method = (await listCheckoutMethods(await getLocale())).find((m) => m.key === methodKey);
    if (!method || method.type !== "gateway" || method.mode !== "mock" || !isGatewayKey(methodKey)) {
      throw new FormError(t("Test checkout is not available for this method.", "الدفع التجريبي غير متاح لهذه الوسيلة."));
    }
    const outcome = oneOf(fd, "outcome", ["paid", "failed"] as const, "paid");
    await processGatewayEvent({ provider: methodKey, event: simulatedEvent(invoice.payment.id, outcome), simulated: true });
    return { ok: true, redirect: `/portal/orders/${invoice.order.id}` };
  });
}
