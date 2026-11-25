export type Locale = "en" | "ar";

/** A bilingual pair: [English, Arabic]. */
export type Bi = readonly [string, string];

/* ───────────────────────────── Admin permissions ───────────────────────────── */

export const PERMISSIONS = [
  "portfolio",
  "services",
  "contracts",
  "payments",
  "clients",
  "orders",
  "finance",
  "inquiries",
  "settings",
  "admins",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, Bi> = {
  portfolio: ["Portfolio & media", "معرض الأعمال والوسائط"],
  services: ["Services & pricing", "الخدمات والأسعار"],
  contracts: ["Contracts & SLAs", "العقود واتفاقيات الخدمة"],
  payments: ["Payment setup & webhooks", "إعدادات الدفع والويب هوك"],
  clients: ["Clients", "العملاء"],
  orders: ["Orders, retainers & reports", "الطلبات والاشتراكات والتقارير"],
  finance: ["Finance & cost control", "المالية وضبط التكاليف"],
  inquiries: ["Inquiries", "الاستفسارات"],
  settings: ["Site settings", "إعدادات الموقع"],
  admins: ["Admin accounts", "حسابات المشرفين"],
};

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  isMaster: boolean;
  permissions: Permission[];
}

export interface ClientUser {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  status: ClientStatus;
  locale: Locale;
}

/* ───────────────────────────────── Enumerations ────────────────────────────── */

export const CLIENT_STATUSES = ["pending", "active", "suspended"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const ORDER_STATUSES = ["new", "active", "on_hold", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["due", "submitted", "paid", "failed", "cancelled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BILLING_CYCLES = ["one_time", "monthly", "quarterly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const REPORT_TYPES = ["update", "report", "deliverable"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const PORTFOLIO_CATEGORIES = ["content", "web", "operations", "financial", "pos", "legal", "other"] as const;
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export const EXPENSE_CATEGORIES = [
  "salaries",
  "rent",
  "software",
  "marketing",
  "contractors",
  "production",
  "government",
  "transport",
  "equipment",
  "utilities",
  "other",
] as const;
export const INCOME_CATEGORIES = ["consulting", "retainer", "project", "other"] as const;

export const LABELS = {
  clientStatus: {
    pending: ["Awaiting activation", "بانتظار التفعيل"],
    active: ["Active", "مفعّل"],
    suspended: ["Suspended", "موقوف"],
  },
  orderStatus: {
    new: ["New request", "طلب جديد"],
    active: ["In progress", "قيد التنفيذ"],
    on_hold: ["On hold", "معلّق"],
    completed: ["Completed", "مكتمل"],
    cancelled: ["Cancelled", "ملغى"],
  },
  paymentStatus: {
    due: ["Payment due", "مستحق الدفع"],
    submitted: ["Awaiting confirmation", "بانتظار التأكيد"],
    paid: ["Paid", "مدفوع"],
    failed: ["Failed", "فشل الدفع"],
    cancelled: ["Cancelled", "ملغى"],
  },
  billingCycle: {
    one_time: ["One-time", "مرة واحدة"],
    monthly: ["Monthly", "شهري"],
    quarterly: ["Quarterly", "ربع سنوي"],
    yearly: ["Yearly", "سنوي"],
  },
  perCycle: {
    one_time: ["one-time", "مرة واحدة"],
    monthly: ["per month", "شهريًا"],
    quarterly: ["per quarter", "كل ثلاثة أشهر"],
    yearly: ["per year", "سنويًا"],
  },
  reportType: {
    update: ["Update", "تحديث"],
    report: ["Report", "تقرير"],
    deliverable: ["Deliverable", "مُخرَج"],
  },
  portfolioCategory: {
    content: ["Content & social", "المحتوى والتواصل"],
    web: ["Web & ordering", "المواقع والطلب"],
    operations: ["Operations", "التشغيل"],
    financial: ["Financial & pricing", "المالية والتسعير"],
    pos: ["POS & analytics", "نقاط البيع والتحليلات"],
    legal: ["Government & legal", "الحكومي والقانوني"],
    other: ["Other", "أخرى"],
  },
  financeCategory: {
    salaries: ["Salaries", "الرواتب"],
    rent: ["Rent", "الإيجار"],
    software: ["Software & subscriptions", "البرمجيات والاشتراكات"],
    marketing: ["Marketing", "التسويق"],
    contractors: ["Freelancers & contractors", "المستقلون والمتعاقدون"],
    production: ["Content production", "إنتاج المحتوى"],
    government: ["Government fees", "الرسوم الحكومية"],
    transport: ["Transport", "المواصلات"],
    equipment: ["Equipment", "المعدات"],
    utilities: ["Utilities", "المرافق"],
    consulting: ["Consulting fees", "أتعاب الاستشارات"],
    retainer: ["Retainers", "الاشتراكات الشهرية"],
    project: ["Project work", "أعمال المشاريع"],
    other: ["Other", "أخرى"],
  },
} as const satisfies Record<string, Record<string, Bi>>;

/** Looks up a bilingual label, falling back to the raw key for unknown values. */
export function biLabel(group: keyof typeof LABELS, key: string): Bi {
  const map = LABELS[group] as Record<string, Bi>;
  return map[key] ?? [key, key];
}

/* ─────────────────────────────── Shared shapes ─────────────────────────────── */

export type ActionResult = { ok: true; message?: string; redirect?: string } | { ok: false; error: string };

export interface PortfolioSlide {
  id: string;
  title: string;
  description: string;
  category: string;
  /** image/video are rendered natively; embed is rendered in an iframe player. */
  kind: "image" | "video" | "embed";
  src: string;
  cover: string | null;
  provider: string | null;
  portrait: boolean;
}

export interface CheckoutMethod {
  key: string;
  type: "manual" | "gateway";
  name: string;
  instructions: string;
  mode: "mock" | "live";
  qrUrl: string | null;
  bank: { bankName: string; accountName: string; iban: string; swift: string } | null;
}
