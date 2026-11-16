"use client";

import {
  ChartPie,
  ClipboardList,
  CreditCard,
  FileSignature,
  Images,
  Inbox,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageToggle, SignOutButton } from "@/components/ui/misc";
import { useT } from "@/i18n/client";
import type { Bi, Permission } from "@/types";

const NAV: Array<{ href: string; icon: LucideIcon; label: Bi; permission?: Permission; count?: string }> = [
  { href: "/admin/overview", icon: LayoutDashboard, label: ["Overview", "نظرة عامة"] },
  { href: "/admin/orders", icon: ClipboardList, label: ["Orders & retainers", "الطلبات والاشتراكات"], permission: "orders", count: "orders" },
  { href: "/admin/clients", icon: Users, label: ["Clients", "العملاء"], permission: "clients", count: "clients" },
  { href: "/admin/inquiries", icon: Inbox, label: ["Inquiries", "الاستفسارات"], permission: "inquiries", count: "inquiries" },
  { href: "/admin/portfolio", icon: Images, label: ["Portfolio & media", "معرض الأعمال"], permission: "portfolio" },
  { href: "/admin/services", icon: Tags, label: ["Services & pricing", "الخدمات والأسعار"], permission: "services" },
  { href: "/admin/contracts", icon: FileSignature, label: ["Contracts & SLAs", "العقود والاتفاقيات"], permission: "contracts" },
  { href: "/admin/payments", icon: CreditCard, label: ["Payment setup", "إعدادات الدفع"], permission: "payments" },
  { href: "/admin/finance", icon: ChartPie, label: ["Finance & costs", "المالية والتكاليف"], permission: "finance" },
  { href: "/admin/team", icon: ShieldCheck, label: ["Admin accounts", "حسابات المشرفين"], permission: "admins" },
  { href: "/admin/settings", icon: Settings, label: ["Settings", "الإعدادات"] },
];

export function AdminShell({
  admin,
  allowed,
  counts,
  children,
}: {
  admin: { name: string; isMaster: boolean };
  allowed: Permission[];
  counts: Record<string, number>;
  children: ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((item) => !item.permission || allowed.includes(item.permission));

  return (
    <div className="min-h-screen lg:ps-64">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-navy-50"
          aria-label={t("Open menu", "فتح القائمة")}
          aria-expanded={open}
          aria-controls="admin-nav"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-navy-950/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        id="admin-nav"
        className={`fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-line bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-navy-50 lg:hidden"
            aria-label={t("Close menu", "إغلاق القائمة")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={t("Management", "الإدارة")} className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const count = item.count ? (counts[item.count] ?? 0) : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                      active ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-navy-50"
                    }`}
                  >
                    <item.icon className="size-[18px] shrink-0" aria-hidden="true" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate">{t(item.label[0], item.label[1])}</span>
                    {count > 0 && (
                      <span className={`rounded-full px-2 text-xs leading-5 font-semibold tabular-nums ${active ? "bg-amber-400 text-navy-950" : "bg-amber-100 text-amber-700"}`}>
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <p className="truncate px-3 text-sm font-medium text-navy-900">{admin.name}</p>
          <p className="px-3 text-[13px] text-muted">{admin.isMaster ? t("Master admin", "المشرف الرئيسي") : t("Admin", "مشرف")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <LanguageToggle />
            <SignOutButton endpoint="/api/admin/auth/logout" redirectTo="/admin" />
          </div>
        </div>
      </aside>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
    </div>
  );
}
