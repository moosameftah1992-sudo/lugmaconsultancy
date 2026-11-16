import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db } from "./index";
import { admins, contracts, paymentMethods, services } from "./schema";
import { buildContract, PAYMENT_METHOD_DEFAULTS, PILLARS } from "./seed-content";

/**
 * Master administrator. The password is stored only as a scrypt hash; set
 * MASTER_ADMIN_USERNAME / MASTER_ADMIN_PASSWORD before the first start to use
 * different credentials. Once the account exists these values are ignored —
 * change the password from /admin → Settings.
 */
const MASTER_USERNAME = process.env.MASTER_ADMIN_USERNAME?.trim() || "Moosameftah";
const MASTER_DEFAULT_HASH =
  "scrypt:4a5b9bf560087fd6087b87865d49eb6f:4dabcb37f6b71345fbf170c3010106f199fd7a964c462ed157ba4b435dfbff7647c3cf711a8e253666ab71fc64980539a89372233d743093c27aeec37d1fa41d";

let ready: Promise<void> | null = null;

/**
 * Idempotently installs the structural records the platform cannot run without:
 * the six service pillars with their SLAs, the payment channels (all disabled),
 * and the master admin. It never creates clients, orders, portfolio or finance data.
 */
export function ensureBootstrap(): Promise<void> {
  if (!ready) {
    ready = run().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function run(): Promise<void> {
  const existing = new Set((await db.select({ slug: services.slug }).from(services)).map((r) => r.slug));
  for (const [index, pillar] of PILLARS.entries()) {
    if (existing.has(pillar.slug)) continue;
    const [row] = await db
      .insert(services)
      .values({
        slug: pillar.slug,
        sortOrder: index + 1,
        titleEn: pillar.titleEn,
        titleAr: pillar.titleAr,
        summaryEn: pillar.summaryEn,
        summaryAr: pillar.summaryAr,
        descriptionEn: pillar.descriptionEn,
        descriptionAr: pillar.descriptionAr,
        deliverablesEn: pillar.deliverablesEn.join("\n"),
        deliverablesAr: pillar.deliverablesAr.join("\n"),
      })
      .onConflictDoNothing()
      .returning({ id: services.id });
    if (row) {
      await db
        .insert(contracts)
        .values({ serviceId: row.id, ...buildContract(pillar) })
        .onConflictDoNothing();
    }
  }

  await db
    .insert(paymentMethods)
    .values(PAYMENT_METHOD_DEFAULTS.map((m) => ({ ...m })))
    .onConflictDoNothing();

  const [master] = await db.select({ id: admins.id }).from(admins).where(eq(admins.isMaster, true)).limit(1);
  if (!master) {
    const configured = process.env.MASTER_ADMIN_PASSWORD;
    await db
      .insert(admins)
      .values({
        username: MASTER_USERNAME,
        usernameKey: MASTER_USERNAME.toLowerCase(),
        name: MASTER_USERNAME,
        passwordHash: configured ? await hashPassword(configured) : MASTER_DEFAULT_HASH,
        isMaster: true,
      })
      .onConflictDoNothing();
  }
}
