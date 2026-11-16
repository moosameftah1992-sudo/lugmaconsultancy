import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { Permission } from "../types";

/** Binary column used to keep uploaded media inside PostgreSQL (portable to Neon / serverless). */
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const tz = (name: string) => timestamp(name, { withTimezone: true });
/** Bahraini Dinar amounts: three decimal places (fils). */
const money = (name: string) => numeric(name, { precision: 12, scale: 3 });

/* ────────────────────────────── Accounts & auth ────────────────────────────── */

export const admins = pgTable("admins", {
  id: id(),
  username: varchar("username", { length: 60 }).notNull(),
  usernameKey: varchar("username_key", { length: 60 }).notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  /** The master account can never be edited or removed by other admins. */
  isMaster: boolean("is_master").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  permissions: jsonb("permissions").$type<Permission[]>().notNull().default([]),
  lastLoginAt: tz("last_login_at"),
  createdAt: createdAt(),
});

export const clients = pgTable("clients", {
  id: id(),
  name: text("name").notNull(),
  businessName: text("business_name").notNull().default(""),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  /** pending → active (activated by an admin) → suspended */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  locale: varchar("locale", { length: 2 }).notNull().default("en"),
  adminNotes: text("admin_notes").notNull().default(""),
  activatedAt: tz("activated_at"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    userType: varchar("user_type", { length: 10 }).notNull(),
    userId: uuid("user_id").notNull(),
    expiresAt: tz("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userType, t.userId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: id(),
    key: text("key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)],
);

/* ─────────────────────────────────── Media ─────────────────────────────────── */

export const mediaFiles = pgTable("media_files", {
  id: id(),
  filename: text("filename").notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  size: integer("size").notNull(),
  /** portfolio | cover | qr | report */
  purpose: varchar("purpose", { length: 20 }).notNull(),
  /** public files are served to anyone; private files require an admin or the owning client. */
  visibility: varchar("visibility", { length: 10 }).notNull().default("public"),
  /** false until a record references the upload; stale unattached uploads are swept. */
  attached: boolean("attached").notNull().default(false),
  data: bytea("data").notNull(),
  createdAt: createdAt(),
});

/* ───────────────────────── Services, packages, contracts ───────────────────── */

export const services = pgTable("services", {
  id: id(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull(),
  summaryEn: text("summary_en").notNull().default(""),
  summaryAr: text("summary_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  /** One deliverable per line. */
  deliverablesEn: text("deliverables_en").notNull().default(""),
  deliverablesAr: text("deliverables_ar").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: tz("updated_at").defaultNow().notNull(),
});

export const packages = pgTable(
  "packages",
  {
    id: id(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    descriptionAr: text("description_ar").notNull().default(""),
    /** One feature per line. */
    featuresEn: text("features_en").notNull().default(""),
    featuresAr: text("features_ar").notNull().default(""),
    priceBhd: money("price_bhd").notNull(),
    /** one_time | monthly | quarterly | yearly */
    billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("packages_service_idx").on(t.serviceId)],
);

export const contracts = pgTable("contracts", {
  id: id(),
  serviceId: uuid("service_id")
    .notNull()
    .unique()
    .references(() => services.id, { onDelete: "cascade" }),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull(),
  bodyEn: text("body_en").notNull(),
  bodyAr: text("body_ar").notNull(),
  /** Incremented whenever the wording changes; orders snapshot the version they accepted. */
  version: integer("version").notNull().default(1),
  updatedBy: text("updated_by"),
  updatedAt: tz("updated_at").defaultNow().notNull(),
});

/* ───────────────────────────────── Portfolio ───────────────────────────────── */

export const portfolioItems = pgTable("portfolio_items", {
  id: id(),
  titleEn: text("title_en").notNull().default(""),
  titleAr: text("title_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  category: varchar("category", { length: 30 }).notNull().default("other"),
  /** upload = file stored in media_files; external = embedded third-party URL. */
  sourceType: varchar("source_type", { length: 10 }).notNull(),
  /** image | video | embed */
  mediaKind: varchar("media_kind", { length: 10 }).notNull(),
  fileId: uuid("file_id").references(() => mediaFiles.id, { onDelete: "set null" }),
  externalUrl: text("external_url"),
  /** youtube | instagram | vimeo | tiktok | image | video */
  embedProvider: varchar("embed_provider", { length: 20 }),
  coverFileId: uuid("cover_file_id").references(() => mediaFiles.id, { onDelete: "set null" }),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/* ────────────────────────────────── Payments ───────────────────────────────── */

export interface PaymentMethodConfig {
  bankName?: string;
  accountName?: string;
  iban?: string;
  swift?: string;
}

export const paymentMethods = pgTable("payment_methods", {
  key: varchar("key", { length: 30 }).primaryKey(),
  /** manual = confirmed by an admin; gateway = confirmed by a signed webhook. */
  type: varchar("type", { length: 10 }).notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  instructionsEn: text("instructions_en").notNull().default(""),
  instructionsAr: text("instructions_ar").notNull().default(""),
  isEnabled: boolean("is_enabled").notNull().default(false),
  /** Gateways only: mock (no money moves) | live. */
  mode: varchar("mode", { length: 10 }).notNull().default("mock"),
  config: jsonb("config").$type<PaymentMethodConfig>().notNull().default({}),
  qrFileId: uuid("qr_file_id").references(() => mediaFiles.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: tz("updated_at").defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: serial("number").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),
    /** Snapshot of the package name at the time of the request. */
    packageName: text("package_name").notNull().default(""),
    /** null = quote requested, price to be agreed. */
    amountBhd: money("amount_bhd"),
    billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("one_time"),
    /** new | active | on_hold | completed | cancelled */
    status: varchar("status", { length: 20 }).notNull().default("new"),
    progress: integer("progress").notNull().default(0),
    clientNotes: text("client_notes").notNull().default(""),
    adminNotes: text("admin_notes").notNull().default(""),
    contractVersion: integer("contract_version"),
    contractSnapshot: text("contract_snapshot"),
    contractAcceptedAt: tz("contract_accepted_at"),
    createdAt: createdAt(),
    updatedAt: tz("updated_at").defaultNow().notNull(),
  },
  (t) => [index("orders_client_idx").on(t.clientId), index("orders_status_idx").on(t.status)],
);

/** A payment row is an invoice line: created as "due", then settled manually or by a gateway. */
export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    label: text("label").notNull().default(""),
    amountBhd: money("amount_bhd").notNull(),
    /** due | submitted | paid | failed | cancelled */
    status: varchar("status", { length: 20 }).notNull().default("due"),
    methodKey: varchar("method_key", { length: 30 }),
    clientReference: text("client_reference"),
    providerRef: text("provider_ref"),
    /** true when settled through a gateway in mock mode — excluded from finance figures. */
    isSimulated: boolean("is_simulated").notNull().default(false),
    note: text("note"),
    paidAt: tz("paid_at"),
    createdAt: createdAt(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_status_idx").on(t.status)],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: id(),
    provider: varchar("provider", { length: 30 }).notNull(),
    eventId: text("event_id").notNull(),
    signatureValid: boolean("signature_valid").notNull().default(false),
    simulated: boolean("simulated").notNull().default(false),
    /** received | processed | ignored | rejected | error */
    status: varchar("status", { length: 20 }).notNull().default("received"),
    paymentId: uuid("payment_id"),
    message: text("message"),
    payload: jsonb("payload"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("webhook_events_provider_event_idx").on(t.provider, t.eventId)],
);

/* ───────────────────────── Client updates & reports ────────────────────────── */

export const reports = pgTable(
  "reports",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    /** update | report | deliverable */
    type: varchar("type", { length: 20 }).notNull().default("update"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    linkUrl: text("link_url"),
    progress: integer("progress"),
    /** null = draft (invisible to the client). */
    publishedAt: tz("published_at"),
    /** Result of the notification e-mail: sent | failed | not_configured | skipped */
    emailStatus: varchar("email_status", { length: 20 }),
    createdByName: text("created_by_name"),
    createdAt: createdAt(),
  },
  (t) => [index("reports_order_idx").on(t.orderId), index("reports_client_idx").on(t.clientId)],
);

export const reportAttachments = pgTable(
  "report_attachments",
  {
    id: id(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => mediaFiles.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
  },
  (t) => [index("report_attachments_report_idx").on(t.reportId), index("report_attachments_file_idx").on(t.fileId)],
);

export const emailLog = pgTable("email_log", {
  id: id(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  kind: varchar("kind", { length: 30 }).notNull(),
  /** sent | failed | not_configured */
  status: varchar("status", { length: 20 }).notNull(),
  error: text("error"),
  createdAt: createdAt(),
});

/* ────────────────────────────── Finance & misc ─────────────────────────────── */

export const financeEntries = pgTable(
  "finance_entries",
  {
    id: id(),
    entryDate: date("entry_date").notNull(),
    /** income | expense */
    kind: varchar("kind", { length: 10 }).notNull(),
    category: varchar("category", { length: 40 }).notNull(),
    /** Expenses only: fixed | variable (drives the break-even calculation). */
    costType: varchar("cost_type", { length: 10 }),
    description: text("description").notNull().default(""),
    amountBhd: money("amount_bhd").notNull(),
    createdByName: text("created_by_name"),
    createdAt: createdAt(),
  },
  (t) => [index("finance_entries_date_idx").on(t.entryDate)],
);

export const inquiries = pgTable("inquiries", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  business: text("business").notNull().default(""),
  serviceSlug: varchar("service_slug", { length: 60 }),
  message: text("message").notNull(),
  /** new | handled */
  status: varchar("status", { length: 20 }).notNull().default("new"),
  locale: varchar("locale", { length: 2 }).notNull().default("en"),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 40 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: tz("updated_at").defaultNow().notNull(),
});
