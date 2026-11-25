import { ArrowRight, Calculator, Check, Clapperboard, ClipboardCheck, Landmark, MonitorSmartphone, ScanBarcode, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { bi, makeT, pick } from "@/i18n";
import { formatBhd, toLines } from "@/lib/format";
import type { SiteSettings } from "@/lib/site";
import { biLabel, type Locale } from "@/types";

const ICONS: Record<string, LucideIcon> = {
  "operational-auditing": ClipboardCheck,
  "financial-engineering": Calculator,
  "web-ordering": MonitorSmartphone,
  "pos-analytics": ScanBarcode,
  "content-social": Clapperboard,
  "government-legal": Landmark,
};

export function ServiceIcon({ slug, className = "size-6" }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] ?? ClipboardCheck;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}

interface PackageRow {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  featuresEn: string;
  featuresAr: string;
  priceBhd: string;
  billingCycle: string;
  isFeatured: boolean;
}

/** A priced package / retainer. Prices come straight from the admin panel, in BHD. */
export function PackageCard({ pkg, slug, locale, serviceTitle }: { pkg: PackageRow; slug: string; locale: Locale; serviceTitle?: string }) {
  const t = makeT(locale);
  const features = toLines(pick(locale, pkg.featuresEn, pkg.featuresAr));
  const description = pick(locale, pkg.descriptionEn, pkg.descriptionAr);
  return (
    <article className={`card flex flex-col p-6 ${pkg.isFeatured ? "border-emerald-500 shadow-soft ring-1 ring-emerald-500" : ""}`}>
      {serviceTitle && <p className="text-[13px] font-medium text-emerald-700">{serviceTitle}</p>}
      <div className="mt-1 flex items-start justify-between gap-3">
        <h3 className="text-lg leading-snug font-semibold text-navy-900">{pick(locale, pkg.nameEn, pkg.nameAr)}</h3>
        {pkg.isFeatured && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">{t("Most chosen", "الأكثر اختيارًا")}</span>
        )}
      </div>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-semibold text-navy-900 tabular-nums">{formatBhd(pkg.priceBhd, locale)}</span>
        <span className="text-sm text-muted">{bi(t, biLabel("perCycle", pkg.billingCycle))}</span>
      </p>
      {description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>}
      {features.length > 0 && (
        <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
          {features.map((f) => (
            <li key={f} className="flex gap-2.5 text-[15px] leading-relaxed text-navy-800">
              <Check className="mt-1 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-6">
        <Link href={`/portal/request/${slug}?package=${pkg.id}`} className={`btn w-full ${pkg.isFeatured ? "btn-accent" : "btn-primary"}`}>
          {t("Request this package", "اطلب هذه الباقة")}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

/** Public footer. Contact details appear only once an admin has entered them. */
export function SiteFooter({
  locale,
  services,
  site,
}: {
  locale: Locale;
  services: Array<{ slug: string; title: string }>;
  site: SiteSettings;
}) {
  const t = makeT(locale);
  const address = pick(locale, site.addressEn, site.addressAr);
  const hasContact = Boolean(site.email || site.phone || site.whatsapp || site.instagram || address);
  const link = "inline-flex min-h-9 items-center text-[15px] text-navy-800 transition-colors hover:text-emerald-700";

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.8fr_1fr]">
        <div>
          <Link href="/" aria-label={t("Luqma — home", "لقمة — الرئيسية")} className="inline-block">
            <Logo tagline />
          </Link>
          <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-muted">
            {t(
              "Your integrated consultancy destination in Bahrain: we address operational challenges, price menus, build platforms, and promote them — with transparency and step-by-step follow-up",
              "وجهتك الاستشارية المتكاملة في البحرين: نعالج تحديات التشغيل، نسعّر القوائم، نبني المنصات، ونروّج لها — بشفافية ومتابعة خطوة بخطوة",
            )}
          </p>
        </div>

        <nav aria-label={t("Services", "الخدمات")}>
          <h2 className="text-sm font-semibold text-navy-900">{t("Services", "الخدمات")}</h2>
          <ul className="mt-3">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className={link}>
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("Luqma", "لقمة")}>
          <h2 className="text-sm font-semibold text-navy-900">{t("Luqma", "لقمة")}</h2>
          <ul className="mt-3">
            {(
              [
                ["/#work", t("Our work", "أعمالنا")],
                ["/#process", t("How we work", "طريقة عملنا")],
                ["/#contact", t("Book a consultation", "احجز استشارة")],
                ["/portal/login", t("Client portal", "بوابة العملاء")],
              ] as const
            ).map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-navy-900">{t("Get in touch", "تواصل معنا")}</h2>
          {hasContact ? (
            <ul className="mt-3">
              {site.email && (
                <li>
                  <a href={`mailto:${site.email}`} dir="ltr" className={link}>
                    {site.email}
                  </a>
                </li>
              )}
              {site.phone && (
                <li>
                  <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className={link}>
                    {site.phone}
                  </a>
                </li>
              )}
              {site.whatsapp && (
                <li>
                  <a href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={link}>
                    {t("WhatsApp", "واتساب")}
                  </a>
                </li>
              )}
              {site.instagram && (
                <li>
                  <a href={`https://www.instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer" dir="ltr" className={link}>
                    @{site.instagram}
                  </a>
                </li>
              )}
              {address && <li className="mt-1 text-[15px] leading-relaxed text-muted">{address}</li>}
            </ul>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              <Link href="/#contact" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
                {t("Send us a message", "أرسل لنا رسالة")}
              </Link>{" "}
              {t("and we will reply within one working day.", "وسنرد عليك خلال يوم عمل واحد.")}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} Luqma. {t("All rights reserved.", "جميع الحقوق محفوظة.")}
          </p>
          <p>{t("From the heart of the Kingdom of Bahrain.. shaping operational excellence", "من قلب مملكة البحرين.. نصنع فارق التشغيل")}</p>
        </div>
      </div>
    </footer>
  );
}