import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { settings } from "@/db/schema";

export interface SiteSettings {
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  addressEn: string;
  addressAr: string;
}

const EMPTY: SiteSettings = { email: "", phone: "", whatsapp: "", instagram: "", addressEn: "", addressAr: "" };

/** Public contact details. Empty until an admin fills them in — nothing is invented. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const [row] = await db.select().from(settings).where(eq(settings.key, "site")).limit(1);
  return { ...EMPTY, ...((row?.value as Partial<SiteSettings> | undefined) ?? {}) };
});

/** Absolute base URL for e-mails, webhooks and gateway return URLs. */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  return `${proto}://${host}`;
}
