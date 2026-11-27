import { FaqSection } from "@/components/site/FaqSection";
import { ArrowRight, ArrowUpRight, BellRing, FileCheck2, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/site/ContactForm";
import { PackageCard, ServiceIcon } from "@/components/site/parts";
import { PortfolioCarousel } from "@/components/site/PortfolioCarousel";
import { makeT, pick } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { listPackages, listPortfolioSlides, listServices } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const t = makeT(locale);
  const ar = locale === "ar";
  const [services, slides, allPackages] = await Promise.all([listServices(), listPortfolioSlides(locale), listPackages({ activeOnly: true })]);

  const serviceById = new Map(services.map((s) => [s.id, s]));
  const offered = allPackages.filter((p) => serviceById.has(p.serviceId));
  const featured = offered.filter((p) => p.isFeatured);
  const pricing = (featured.length ? featured : offered).slice(0, 6);
  const serviceOptions = services.map((s) => ({ slug: s.slug, title: pick(locale, s.titleEn, s.titleAr) }));
  const content = services.find((s) => s.slug === "content-social");

  const steps = [
    {
      title: t("Diagnose", "التشخيص"),
      body: t(
        "We start on site — service, kitchen, numbers and paperwork — and tell you plainly what we find",
        "نبدأ من الموقع — الخدمة والمطبخ والأرقام والأوراق — ونخبرك بوضوح بما نجده",
      ),
    },
    {
      title: t("Agree", "الاتفاق"),
      body: t(
        "You get a defined scope, a price in BHD and a service agreement you can read before you commit",
        "تحصل على نطاق محدد وسعر بالدينار البحريني واتفاقية خدمة تقرؤها قبل أن تلتزم",
      ),
    },
    {
      title: t("Deliver", "التنفيذ"),
      body: t(
        "Our team works alongside yours until the change is running in your restaurant, not sitting in a file",
        "يعمل فريقنا مع فريقك حتى يصبح التغيير واقعًا في مطعمك لا ملفًا على الرف",
      ),
    },
    {
      title: t("Report", "التقرير"),
      body: t(
        "Every update, report and deliverable lands in your private portal, with an e-mail the moment it is published",
        "كل تحديث وتقرير ومُخرَج يصل إلى بوابتك الخاصة، مع بريد إلكتروني لحظة نشره",
      ),
    },
  ];

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14 lg:pt-16 lg:pb-24">
          <div>
            <p className="eyebrow">{t("Restaurant solutions & operations · Bahrain", "حلول وتشغيل المطاعم · البحرين")}</p>
            <h1 className="mt-5 text-[2.6rem] leading-[1.06] font-semibold tracking-tight text-balance text-navy-900 sm:text-6xl lg:text-[4.1rem] rtl:leading-[1.3]">
              {ar ? (
                <>
                  خلف كل طبق ناجح.. <span className="text-emerald-600">تشغيل دقيق ومحكم</span>
                </>
              ) : (
                <>
                  Every bite, backed by <span className="text-emerald-600">better operations</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {t(
                "Luqma is the consultancy Bahrain's restaurants call when margins slip, service slows or paperwork stalls. We audit, price, build, connect, publish and clear — under one roof",
                "لقمة هي شريكك الاستشاري الموثوق في البحرين لتجاوز تراجع الهوامش، بطء الخدمة، وعراقيل المعاملات. ندقّق، نسعّر، نطور، وننجز أعمالك التشغيلية — تحت سقف واحد",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#contact" className="btn btn-amber">
                {t("Book a Free consultation", "احجز استشارة مجانية")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link href="#services" className="btn btn-ghost">
                {t("See the six pillars", "تعرّف على الركائز الست")}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-lift sm:aspect-[16/11] lg:aspect-[4/5]">
              <Image
                src="/images/hero.jpg"
                alt={t("A chef finishing a grilled fish dish at the kitchen pass", "طاهٍ يضع اللمسات الأخيرة على طبق سمك مشوي عند منفذ المطبخ")}
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover object-[50%_45%]"
              />
            </div>
            <div className="absolute -bottom-6 start-4 max-w-[16rem] rounded-2xl border border-line bg-white p-4 shadow-lift sm:start-[-1.5rem]">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <span className="grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <LockKeyhole className="size-4" aria-hidden="true" />
                </span>
                {t("Secure operational data", "بياناتك التشغيلية بأمان")}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                {t(
                  "A secure and private platform to manage all your restaurant consultations and reports with confidence",
                  "منصة مشفرة وخاصة جداً لإدارة كافة استشارات وتقارير مطعمك بثقة"
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Six pillars ───────────── */}
      <section id="services" className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">{t("What we do", "ماذا نقدّم")}</p>
            <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-[2.6rem] rtl:leading-snug">
              {t("Six pillars. One accountable partner.", "منظومة متكاملة من 6 ركائز لنجاح مطعمك")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {t(
                "Take one service or combine them. Each comes with a written scope, a clear price and a service agreement",
                "صمّم باقتك بما يناسب احتياجات مطعمك التشغيلية؛ خدمة مستقلة أو منظومة كاملة، مع التزام تام بنطاق عمل وعقود مضمونة",
              )}
            </p>
          </div>

          <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <li key={s.id} className="bg-white">
                <Link href={`/services/${s.slug}`} className="group flex h-full flex-col p-7 transition-colors hover:bg-navy-50/60">
                  <span className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                      <ServiceIcon slug={s.slug} />
                    </span>
                    <span dir="ltr" className="text-sm font-semibold text-amber-600 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <h3 className="mt-6 text-xl leading-snug font-semibold text-navy-900">{pick(locale, s.titleEn, s.titleAr)}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted">{pick(locale, s.summaryEn, s.summaryAr)}</p>
                  <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium text-emerald-700">
                    {t("Scope and pricing", "النطاق والأسعار")}
                    <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Monthly content engine ───────────── */}
      {content && (
        <section className="bg-navy-900 text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
            <div>
              <p className="text-[13px] font-semibold tracking-[0.14em] text-amber-300 uppercase">{t("Content & social media", "إدارة المحتوى والتسويق الرقمي")}</p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl rtl:leading-snug">
                {t("Monthly content engine that frees you from thinking", "محرك محتوى شهري يغنيك عن التفكير")}
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-navy-200">
                {t(
                  "A precise and diverse monthly content schedule — on-site shooting, fast approval, and professional publishing",
                  "جدول محتوى شهري دقيق ومتنوع — تصوير ميداني، اعتماد سريع، ونشر احترافي"
                )}
              </p>
              <Link href={`/services/${content.slug}`} className="btn btn-amber mt-8">
                {t("Explore package details", "استعرض تفاصيل الباقة")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/10">
              {[
                t("Carousel posts", "منشورات كاروسيل"),
                t("AI-generated videos", "فيديوهات بالذكاء الاصطناعي"),
                t("Static posts", "منشورات ثابتة"),
                t("Real reels, filmed on site", "ريلز حقيقية تُصور في الموقع"),
              ].map((label) => (
                <div key={label} className="bg-navy-900 p-6 sm:p-8 flex flex-col justify-center">
                  <div className="size-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mb-4 font-bold text-lg">
                    ✓
                  </div>
                  <div className="text-[16px] leading-snug font-medium text-white">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────── Portfolio showcase ───────────── */}
      <section id="work" className="overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{t("Our work", "أعمالنا")}</p>
            <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-[2.6rem] rtl:leading-snug">
              {t("Work we have put our name to", "أعمال نضع اسمنا عليها")}
            </h2>
            {slides.length > 0 && (
              <p className="mt-4 text-lg leading-relaxed text-muted">
                {t("Tap any piece to open it — reels and videos play right here", "اضغط على أي عمل لفتحه — الريلز والفيديوهات تُعرض هنا مباشرة")}
              </p>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-[88rem] px-0 pt-10 pb-20 sm:px-6 lg:pb-24">
          {slides.length > 0 ? (
            <PortfolioCarousel slides={slides} />
          ) : (
            <div className="mx-4 max-w-2xl rounded-3xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center sm:mx-auto">
              <p className="text-lg font-medium text-navy-900">{t("Our showcase is being curated", "نُعدّ معرض أعمالنا حاليًا")}</p>
              <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted">
                {t(
                  "Reels, campaigns and platforms will appear here as they are published. In the meantime, ask us for examples relevant to your restaurant",
                  "ستظهر هنا الريلز والحملات والمنصات فور نشرها. وإلى ذلك الحين، اطلب منا أمثلة تناسب مطعمك",
                )}
              </p>
              <Link href="#contact" className="btn btn-ghost mt-6">
                {t("Ask for examples", "اطلب أمثلة")}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ───────────── How we work ───────────── */}
      <section id="process" className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">{t("How we work", "طريقة عملنا")}</p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-[2.6rem] rtl:leading-snug">
                {t("You always know where things stand", "تعرف دائمًا أين وصل العمل")}
              </h2>
              <ul className="mt-8 space-y-4">
                {[
                  [LockKeyhole, t("A private dashboard for your account only", "لوحة خاصة بحسابك وحدك")],
                  [FileCheck2, t("Reports and files you can download any time", "تقارير وملفات تنزّلها في أي وقت")],
                  [BellRing, t("Instant email notification when anything new is published", "إشعار بريدي فوري عند نشر أي تحديث جديد")],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof LockKeyhole;
                  return (
                    <li key={label as string} className="flex items-center gap-3 text-[15px] text-navy-800">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700">
                        <I className="size-4" aria-hidden="true" />
                      </span>
                      {label as string}
                    </li>
                  );
                })}
              </ul>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2">
              {steps.map((step, i) => (
                <li key={step.title} className="bg-white p-7">
                  <span dir="ltr" className="block text-sm font-semibold text-amber-600 tabular-nums rtl:text-right">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-navy-900">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───────────── Packages (only when the admin has priced any) ───────────── */}
      {pricing.length > 0 && (
        <section id="pricing">
          <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:pt-24">
            <div className="max-w-2xl">
              <p className="eyebrow">{t("Packages", "الباقات")}</p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-[2.6rem] rtl:leading-snug">
                {t("Comprehensive packages to kickstart your journey to success", "باقات متكاملة تبدأ بها رحلة نجاحك")}
              </h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pricing.map((p) => {
                const s = serviceById.get(p.serviceId)!;
                return <PackageCard key={p.id} pkg={p} slug={s.slug} locale={locale} serviceTitle={pick(locale, s.titleEn, s.titleAr)} />;
              })}
            </div>
          </div>
        </section>
      )}
            {/* ───────────── FAQ ───────────── */}
<FaqSection locale={locale} />

      {/* ───────────── Contact ───────────── */}
      <section id="contact">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">{t("Start here", "ابدأ من هنا")}</p>
            <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-[2.6rem] rtl:leading-snug">
              {t("Share your restaurant challenges and let's build the solution", "شاركنا تحديات مطعمك لنصنع الحل معاً ")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {t(
                "A short message is enough. We reply within one working day to arrange a first conversation — no obligation",
                "رسالة قصيرة تكفي, نرد خلال يوم عمل واحد لترتيب محادثة أولى — دون أي التزام",
              )}
            </p>
            <p className="mt-8 text-[15px] leading-relaxed text-navy-800">
              {t("Already a client?", "عميل حالي؟")}{" "}
              <Link href="/portal/login" className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
                {t("Sign in to your portal", "سجّل الدخول إلى بوابتك")}
              </Link>
            </p>
          </div>
          <ContactForm services={serviceOptions} />
        </div>
      </section>
    </>
  );
}