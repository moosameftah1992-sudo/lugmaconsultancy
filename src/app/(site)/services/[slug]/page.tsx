import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCard, ServiceIcon } from "@/components/site/parts";
import { ServiceViewTracker } from "@/components/site/ServiceViewTracker";
import { makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getContract, getServiceBySlug, listPackages } from "@/lib/data";
import { formatDate, toLines } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const service = await getServiceBySlug(slug);
  if (!service || !service.isActive) return {};
  return { title: pick(locale, service.titleEn, service.titleAr), description: pick(locale, service.summaryEn, service.summaryAr) };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = makeT(locale);
  const service = await getServiceBySlug(slug);
  if (!service || !service.isActive) notFound();

  const [pkgs, contract] = await Promise.all([listPackages({ serviceId: service.id, activeOnly: true }), getContract(service.id)]);
  const deliverables = toLines(pick(locale, service.deliverablesEn, service.deliverablesAr));
  const title = pick(locale, service.titleEn, service.titleAr);

  return (
    <>
      <ServiceViewTracker slug={service.slug} title={title} />
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-14 sm:px-6 lg:pb-20">
          <Link href="/#services" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-navy-700 hover:text-emerald-700">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t("All services", "جميع الخدمات")}
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ServiceIcon slug={service.slug} className="size-7" />
              </span>
              <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-navy-900 sm:text-5xl rtl:leading-snug">
                {title}
              </h1>
              <p className="mt-5 text-xl leading-relaxed text-navy-800">{pick(locale, service.summaryEn, service.summaryAr)}</p>
              <p className="mt-4 text-[17px] leading-relaxed text-muted">{pick(locale, service.descriptionEn, service.descriptionAr)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={pkgs.length ? "#packages" : `/portal/request/${service.slug}`} className="btn btn-amber">
                  {pkgs.length ? t("See packages", "عرض الباقات") : t("Request a quote", "اطلب عرض سعر")}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
                <Link href="/#contact" className="btn btn-ghost">
                  {t("Talk to us first", "تحدّث إلينا أولًا")}
                </Link>
              </div>
            </div>

            {deliverables.length > 0 && (
              <div className="rounded-3xl border border-line bg-paper p-7">
                <h2 className="text-sm font-semibold text-navy-900">{t("What you get", "ما الذي تحصل عليه")}</h2>
                <ul className="mt-5 space-y-4">
                  {deliverables.map((d) => (
                    <li key={d} className="flex gap-3 text-[16px] leading-relaxed text-navy-800">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                        <Check className="size-3.5" aria-hidden="true" strokeWidth={3} />
                      </span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="packages" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-navy-900">{t("Packages and pricing", "الباقات والأسعار")}</h2>
        {pkgs.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pkgs.map((p) => (
              <PackageCard key={p.id} pkg={p} slug={service.slug} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="card mt-8 flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-navy-900">{t("Priced to your scope", "يُسعَّر حسب نطاق عملك")}</p>
              <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-muted">
                {t(
                  "This service is quoted after a short conversation about your restaurant. Send a request and we will come back with a fixed price in BHD.",
                  "تُسعَّر هذه الخدمة بعد محادثة قصيرة عن مطعمك. أرسل طلبًا وسنعود إليك بسعر ثابت بالدينار البحريني.",
                )}
              </p>
            </div>
            <Link href={`/portal/request/${service.slug}`} className="btn btn-primary shrink-0">
              {t("Request a quote", "اطلب عرض سعر")}
            </Link>
          </div>
        )}

        {contract && (
          <details className="card group mt-10 overflow-hidden">
            <summary className="flex min-h-16 items-center justify-between gap-4 px-6 py-4 marker:content-none">
              <span>
                <span className="block font-semibold text-navy-900">{t("Read the service agreement", "اقرأ اتفاقية الخدمة")}</span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {t(`Version ${contract.version} · updated ${formatDate(contract.updatedAt, locale)}`, `الإصدار ${contract.version} · حُدّثت في ${formatDate(contract.updatedAt, locale)}`)}
                </span>
              </span>
              <span className="text-sm font-medium text-emerald-700 group-open:hidden">{t("Show", "عرض")}</span>
              <span className="hidden text-sm font-medium text-emerald-700 group-open:inline">{t("Hide", "إخفاء")}</span>
            </summary>
            <div className="border-t border-line px-6 py-6">
              <h3 className="text-lg font-semibold text-navy-900">{pick(locale, contract.titleEn, contract.titleAr)}</h3>
              <p className="prose-plain mt-4 max-w-3xl">{pick(locale, contract.bodyEn, contract.bodyAr)}</p>
            </div>
          </details>
        )}
      </section>
    </>
  );
}