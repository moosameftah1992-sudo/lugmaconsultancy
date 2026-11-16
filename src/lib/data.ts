import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureBootstrap } from "@/db/bootstrap";
import { contracts, packages, paymentMethods, portfolioItems, services } from "@/db/schema";
import { pick } from "@/i18n";
import type { CheckoutMethod, Locale, PortfolioSlide } from "@/types";
import { mediaUrl } from "./media";
import { missingEnv, isGatewayKey } from "./payments/gateways";
import { toSlide } from "./portfolio";

export async function listServices(activeOnly = true) {
  await ensureBootstrap();
  const rows = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.titleEn));
  return activeOnly ? rows.filter((s) => s.isActive) : rows;
}

export async function getServiceBySlug(slug: string) {
  await ensureBootstrap();
  const [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
  return row ?? null;
}

export async function listPackages(opts: { serviceId?: string; activeOnly?: boolean } = {}) {
  const conditions = [];
  if (opts.serviceId) conditions.push(eq(packages.serviceId, opts.serviceId));
  if (opts.activeOnly) conditions.push(eq(packages.isActive, true));
  return db
    .select()
    .from(packages)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(packages.sortOrder), asc(packages.priceBhd));
}

export async function getContract(serviceId: string) {
  const [row] = await db.select().from(contracts).where(eq(contracts.serviceId, serviceId)).limit(1);
  return row ?? null;
}

export async function listPaymentMethods() {
  await ensureBootstrap();
  return db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder));
}

/**
 * Payment channels a customer may use right now. Read on every request, so a
 * channel disabled in /admin disappears from checkout immediately.
 */
export async function listCheckoutMethods(locale: Locale): Promise<CheckoutMethod[]> {
  const rows = await listPaymentMethods();
  return rows
    .filter((m) => {
      if (!m.isEnabled) return false;
      if (m.type === "manual") return true;
      // A live gateway without credentials cannot take a payment — never offer it.
      return m.mode === "mock" || (isGatewayKey(m.key) && missingEnv(m.key).length === 0);
    })
    .map((m) => ({
      key: m.key,
      type: m.type === "gateway" ? "gateway" : "manual",
      name: pick(locale, m.nameEn, m.nameAr),
      instructions: pick(locale, m.instructionsEn, m.instructionsAr),
      mode: m.mode === "live" ? "live" : "mock",
      qrUrl: m.key === "benefit_qr" && m.qrFileId ? mediaUrl(m.qrFileId) : null,
      bank:
        m.key === "bank_transfer"
          ? {
              bankName: m.config.bankName ?? "",
              accountName: m.config.accountName ?? "",
              iban: m.config.iban ?? "",
              swift: m.config.swift ?? "",
            }
          : null,
    }));
}

export async function listPortfolioSlides(locale: Locale): Promise<PortfolioSlide[]> {
  const rows = await db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.isPublished, true))
    .orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.createdAt));
  return rows.map((r) => toSlide(r, locale)).filter((s): s is PortfolioSlide => s !== null);
}
