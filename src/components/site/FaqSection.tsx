"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { makeT } from "@/i18n";
import type { Locale } from "@/types";

export function FaqSection({ locale }: { locale: Locale }) {
  const t = makeT(locale);
  const ar = locale === "ar";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: t(
        "When does my restaurant or café in Bahrain need operational intervention from Luqma?",
        "متى يحتاج مطعمي أو مقهاي في البحرين إلى تدخل تشغيلي من «لقمة»؟"
      ),
      a: t(
        "We recommend bringing in the Luqma team when you face shrinking profit margins despite steady sales, unexplained spikes in food and inventory costs, slow service and bottlenecks in the kitchen or dining room, or when preparing to open a new branch and establish clear Standard Operating Procedures (SOPs) that prevent guesswork.",
        "يُنصح بالاستعانة بفريق لقمة عندما تواجه تراجعاً في هوامش الربح رغم استقرار المبيعات، أو ارتفاعاً غير مبرر في تكلفة المواد الغذائية والمخزون، أو بطئاً في سرعة الخدمة واختناقات في المطبخ والصالة، أو عند الاستعداد لافتتاح فرع جديد وتأسيس إجراءات تشغيل (SOPs) واضحة تمنع العشوائية."
      ),
    },
    {
      q: t(
        "How does Luqma address declining profit margins and rising costs in restaurants and cafés?",
        "كيف تعالج «لقمة» مشكلة تراجع هوامش الربح وارتفاع التكاليف في المطاعم والمقاهي؟"
      ),
      a: t(
        "We start with a detailed recipe costing analysis compared against actual selling prices in BHD, then review supplier invoices, waste, spoilage, and unrecorded stock withdrawals, and implement a practical menu pricing and procurement control plan without compromising dish quality or guest experience.",
        "نبدأ بتحليل دقيق لتكلفة كل وصفة (Recipe Costing) ومقارنتها بأسعار البيع الفعلية بالدينار البحريني، ثم نراجع فواتير الموردين ونسب الهدر والتلف والسحب غير المسجّل، ونضع خطة عملية لتسعير القائمة وضبط المشتريات دون المساس بجودة الطبق أو تجربة الضيف."
      ),
    },
    {
      q: t(
        "What is included in Luqma's operational audit?",
        "ما الذي يشمله التدقيق التشغيلي الذي تقدمه «لقمة»؟"
      ),
      a: t(
        "Our operational audit covers daily workflows across the kitchen, prep areas, dining room, and POS, evaluates labor allocation and shift efficiency, identifies bottlenecks and waste, and delivers a clear diagnostic report with prioritized improvements and ready-to-apply SOPs for your team.",
        "يشمل التدقيق التشغيلي متابعة سير العمل اليومي في المطبخ والتحضير والصالة ونقاط البيع، وتقييم توزيع العمالة وكفاءة المناوبات، ورصد مواطن التأخير والهدر، وتقديم تقرير تشخيصي واضح يتضمن أولويات التحسين وإجراءات عمل قياسية قابلة للتطبيق فوراً مع فريقك."
      ),
    },
    {
      q: t(
        "How do the real-time inventory and stock management systems built by Luqma work?",
        "كيف تعمل أنظمة الجرد وإدارة المخزون اللحظية التي تؤسسها «لقمة»؟"
      ),
      a: t(
        "We set up and configure a digital inventory system integrated with your POS to track stock movement from supplier receiving all the way to invoice sales, helping detect variances, waste, and unrecorded withdrawals early while basing purchasing decisions on accurate numbers.",
        "نؤسس ونبرمج منظومة جرد رقمية مرتبطة بنظام نقاط البيع (POS) لمتابعة حركة المخزون من لحظة استلامه من المورد وحتى بيعه في الفاتورة، مما يساعد في رصد الفروقات والهدر والسحب غير المسجّل مبكراً وبناء قرارات شراء مبنية على أرقام دقيقة."
      ),
    },
    {
      q: t(
        "What role do financial engineering and menu pricing play in boosting restaurant profitability?",
        "ما دور الهندسة المالية وتسعير القوائم في رفع ربحية المطعم؟"
      ),
      a: t(
        "Financial engineering connects each item's profitability with its popularity on the menu, allowing us to identify high-margin bestsellers, calibrate portion control, and optimize BHD pricing to strengthen your restaurant or café's net operating profit.",
        "الهندسة المالية تربط بين ربحية كل صنف والإقبال عليه داخل القائمة، بحيث نحدد الأطباق الأعلى ربحية والأكثر طلباً، ونعيد ضبط تكلفة الحصص (Portion Control) والتسعير بالدينار البحريني بما يعزز صافي الربح التشغيلي للمطعم أو المقهى."
      ),
    },
    {
      q: t(
        "Does Luqma assist with licenses and government or operational requirements for restaurants in Bahrain?",
        "هل تساعد «لقمة» في التراخيص والمتطلبات الحكومية والتشغيلية للمطاعم في البحرين؟"
      ),
      a: t(
        "Yes, we provide structured support to complete commercial registration, licensing, and relevant government approvals for the food and hospitality sector in the Kingdom of Bahrain, ensuring full regulatory compliance from setup through ongoing operations.",
        "نعم، نقدم دعماً منظماً لإنهاء إجراءات السجل التجاري والتراخيص والموافقات الحكومية ذات الصلة بالقطاع الغذائي والتشغيلي في مملكة البحرين، وضمان التزام المنشأة بالمعايير والمتطلبات النظامية من التأسيس وحتى التشغيل المستمر."
      ),
    },
    {
      q: t(
        "How do the direct ordering channels and websites developed by Luqma help?",
        "كيف تساعد قنوات الطلب المباشر والمواقع الإلكترونية التي تطورها «لقمة»؟"
      ),
      a: t(
        "We design and build bilingual (Arabic & English) websites and direct ordering channels tailored around your menu and guests, reducing heavy reliance on third-party delivery aggregators while boosting direct orders and customer loyalty.",
        "نصمم ونطور مواقع وقنوات طلب مباشرة باللغتين العربية والإنجليزية مبنية حول قائمة مطعمك وعملائك، لتقليل الاعتماد الكلي على منصات التوصيل الخارجية وتعزيز الطلب المباشر وولاء العملاء."
      ),
    },
    {
      q: t(
        "How does Luqma manage content and marketing for restaurants and cafés?",
        "كيف تتم إدارة المحتوى والتسويق في «لقمة» للمطاعم والمقاهي؟"
      ),
      a: t(
        "We conceptualize and produce comprehensive visual and marketing content—including on-site shoots, real reels, static posts, carousels, and AI-assisted content—following a structured monthly schedule that highlights your brand identity and attracts target diners.",
        "نبتكر وننتج محتوى بصرياً وتسويقياً متكاملاً يشمل التصوير الميداني، والريلز الواقعية، والمنشورات الثابتة، والكاروسيل، والمحتوى المدعوم بالأدوات الحديثة، وفق جدول شهري منظم يبرز هوية المطعم ويجذب العملاء المستهدفين."
      ),
    },
    {
      q: t(
        "What are the steps of working with Luqma from first contact to delivery?",
        "ما هي خطوات العمل مع «لقمة» من أول تواصل وحتى التسليم؟"
      ),
      a: t(
        "Our process follows four clear stages: Diagnose (inspecting your site, kitchen, numbers, and paperwork), Agree (defining the scope, BHD pricing, and a clear service agreement before you commit), Deliver (working alongside your team to turn improvements into daily reality), and Report (documenting updates and deliverables in your private client portal with instant notifications).",
        "يمر العمل بأربع مراحل واضحة: التشخيص (فحص الموقع والمطبخ والأرقام والأوراق)، ثم الاتفاق (تحديد نطاق العمل والسعر بالدينار البحريني واتفاقية خدمة واضحة قبل الالتزام)، ثم التنفيذ (العمل المباشر مع فريقك لتحويل التحسين إلى واقع يومي)، وأخيراً التقرير (توثيق التحديثات والمخرجات عبر بوابة العملاء الخاصة بك مع إشعار فوري)."
      ),
    },
    {
      q: t(
        "How does a restaurant or café owner track progress and results with Luqma?",
        "كيف يتابع صاحب المطعم أو المقهى سير العمل والنتائج مع «لقمة»؟"
      ),
      a: t(
        "Every client receives a private portal to view and download updates, reports, and files at any time, complete with instant email notifications whenever something new is published for full transparency and effortless tracking.",
        "يحصل كل عميل على بوابة عملاء خاصة به تتيح له الاطلاع على التحديثات والتقارير والملفات وتنزيلها في أي وقت، مع إشعارات فورية عند نشر أي تحديث جديد لضمان الشفافية الكاملة وسهولة المتابعة."
      ),
    },
    {
      q: t(
        "What sets working with Luqma apart in the Bahraini market?",
        "ما الذي يميّز العمل مع «لقمة» في السوق البحريني؟"
      ),
      a: t(
        "We combine hands-on understanding of restaurant and café operations in Bahrain with field execution grounded in real numbers and practical workflows rather than generic theoretical advice—backed by a clear scope, transparent BHD pricing, and a dedicated client portal.",
        "نجمع بين الفهم العملي لتفاصيل تشغيل المطاعم والمقاهي في البحرين، والعمل الميداني على الأرقام والإجراءات الواقعية بدلاً من التوصيات النظرية العامة، مع نطاق عمل واضح وتسعير شفاف بالدينار البحريني وبوابة متابعة مخصصة لكل عميل."
      ),
    },
    {
      q: t(
        "How can I book a consultation or get started with the Luqma team?",
        "كيف يمكنني حجز استشارة أو بدء التواصل مع فريق «لقمة»؟"
      ),
      a: ar ? (
        <>
          يمكنك التواصل معنا مباشرة عبر{" "}
          <Link
            href="#contact"
            className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
          >
            قسم التواصل في موقعنا الإلكتروني
          </Link>{" "}
          لحجز جلسة تشخيص ومناقشة وضع مطعمك أو مقهاك وتحديد الخطوة الأنسب لاحتياجك.
        </>
      ) : (
        <>
          You can reach out to us directly through the{" "}
          <Link
            href="#contact"
            className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
          >
            contact section on our website
          </Link>{" "}
          to book a diagnostic session, discuss your restaurant or café&apos;s current situation, and identify the best next step for your needs.
        </>
      ),
    },
  ];

  return (
    <section id="faq" className="border-t border-line bg-white">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="text-center">
          <p className="eyebrow">{t("FAQ", "الأسئلة الشائعة")}</p>
          <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-[2.6rem] rtl:leading-snug">
            {t("Answers to common questions", "إجابات عن أكثر الأسئلة شيوعاً")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            {t(
              "Everything you need to know about how we work with restaurants and cafés in Bahrain",
              "كل ما تحتاج معرفته حول آلية عملنا وخدماتنا التشغيلية للمطاعم والمقاهي في البحرين"
            )}
          </p>
        </div>

        <div className="mt-12 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
          {faqs.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="transition-colors hover:bg-navy-50/40">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-6 text-start sm:p-7"
                >
                  <span className="text-lg leading-snug font-semibold text-navy-900">
                    {item.q}
                  </span>
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors ${
                      isOpen
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <ChevronDown
                      className={`size-4 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-[15px] leading-relaxed text-muted sm:px-7 sm:pb-7">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}