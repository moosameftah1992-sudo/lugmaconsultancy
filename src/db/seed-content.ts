/**
 * Structural configuration that Luqma needs on day one — NOT demo data.
 * The six service pillars, a starting SLA for each, and the payment channels
 * (all switched off). Everything here is editable from /admin afterwards.
 */

export interface Pillar {
  slug: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  descriptionEn: string;
  descriptionAr: string;
  deliverablesEn: string[];
  deliverablesAr: string[];
  clauseEn: string;
  clauseAr: string;
}

export const PILLARS: Pillar[] = [
  {
    slug: "operational-auditing",
    titleEn: "Operational Auditing & Finding Flaws",
    titleAr: "التدقيق التشغيلي وكشف الخلل",
    summaryEn: "We walk your floor and kitchen to find where time, stock and money leak — and fix it alongside your team",
    summaryAr: "ننزل إلى أرض الواقع في صالتك ومطبخك لنرصد مواضع هدر الوقت والمخزون والمال، ونعالجها جنباً إلى جنب مع فريقك",
    descriptionEn:
      "A structured on-site audit of service flow, kitchen workflow, food safety, inventory and staffing. You receive a prioritised findings report, standard operating procedures written for your team, and hands-on follow-up until the fixes hold.",
    descriptionAr:
      "تدقيق ميداني منظّم يشمل انسيابية الخدمة وسير العمل في المطبخ وسلامة الغذاء والمخزون والتوظيف. تحصل على تقرير بالملاحظات مرتّبة حسب الأولوية، وإجراءات تشغيل قياسية مكتوبة لفريقك، ومتابعة عملية حتى تثبت الحلول.",
    deliverablesEn: [
      "On-site audit of front and back of house",
      "Prioritised findings report with root causes",
      "SOPs and checklists tailored to your kitchen",
      "Waste, inventory and staffing review",
      "Follow-up visits until the fixes hold",
    ],
    deliverablesAr: [
      "تدقيق ميداني للصالة والمطبخ",
      "تقرير ملاحظات مرتّب حسب الأولوية مع الأسباب الجذرية",
      "إجراءات تشغيل وقوائم تحقق مصمّمة لمطبخك",
      "مراجعة الهدر والمخزون والتوظيف",
      "زيارات متابعة حتى تثبت الحلول",
    ],
    clauseEn: "Findings reflect the conditions observed during the audit period.",
    clauseAr: "تعكس الملاحظات الأوضاع التي تمت معاينتها خلال فترة التدقيق.",
  },
  {
    slug: "financial-engineering",
    titleEn: "Financial Engineering & Menu Pricing",
    titleAr: "الهندسة المالية وتسعير القوائم",
    summaryEn: "Precise recipe costing and menu engineering in Bahraini Dinars, so every dish achieves its true investment value",
    summaryAr: "حساب دقيق لتكلفة الوصفات وهندسة قائمة الطعام بالدينار البحريني، ليحقق كل طبق قيمته الاستثمارية الحقيقية",
    descriptionEn:
      "We cost every recipe to the fils, map each item by margin and popularity, and rebuild your price list around a target food cost. You also get break-even and cash-flow models you can keep using after we leave.",
    descriptionAr:
      "نحسب تكلفة كل وصفة بالفلس، ونصنّف كل صنف حسب هامشه ورواجه، ونعيد بناء قائمة أسعارك حول نسبة تكلفة غذاء مستهدفة. وتحصل كذلك على نماذج لنقطة التعادل والتدفق النقدي تستمر في استخدامها بعد انتهاء عملنا.",
    deliverablesEn: [
      "Recipe costing per dish in BHD",
      "Menu engineering matrix by margin and popularity",
      "Target food-cost and margin model",
      "Break-even and cash-flow projections",
      "Price list ready for print and POS",
    ],
    deliverablesAr: [
      "تكلفة كل طبق بالدينار البحريني",
      "مصفوفة هندسة القائمة حسب الهامش والرواج",
      "نموذج تكلفة الغذاء والهامش المستهدف",
      "توقعات نقطة التعادل والتدفق النقدي",
      "قائمة أسعار جاهزة للطباعة ونقاط البيع",
    ],
    clauseEn: "Recommendations rely on the cost and sales data the Client provides; the Client remains responsible for its pricing decisions.",
    clauseAr: "تعتمد التوصيات على بيانات التكلفة والمبيعات التي يقدّمها العميل، ويبقى العميل مسؤولًا عن قرارات التسعير.",
  },
  {
    slug: "web-ordering",
    titleEn: "Platform Building & Ordering Sites",
    titleAr: "بناء المنصات ومواقع الطلب",
    summaryEn: "An integrated website and direct ordering channel, custom-designed to serve your menu and customers efficiently",
    summaryAr: "موقع إلكتروني متكامل وقناة طلب مباشرة، مصمم خصيصاً لخدمة قائمتك وعملائك بكفاءة",
    descriptionEn:
      "We design and build restaurant websites and online ordering in Arabic and English — pickup, delivery and table ordering — with a menu you manage yourself and payment methods set up for Bahrain.",
    descriptionAr:
      "نصمّم ونبني مواقع المطاعم ومنصات الطلب الإلكتروني بالعربية والإنجليزية — للاستلام والتوصيل والطلب من الطاولة — مع قائمة تديرها بنفسك ووسائل دفع مهيّأة للبحرين.",
    deliverablesEn: [
      "Bilingual restaurant website (Arabic & English)",
      "Direct online ordering for pickup and delivery",
      "Menu management you control",
      "Payment setup for Bahrain (BenefitPay, cards)",
      "Launch support and handover training",
    ],
    deliverablesAr: [
      "موقع مطعم بلغتين (العربية والإنجليزية)",
      "طلب إلكتروني مباشر للاستلام والتوصيل",
      "إدارة القائمة بيدك",
      "تهيئة الدفع للبحرين (بنفت بي والبطاقات)",
      "دعم الإطلاق وتدريب التسليم",
    ],
    clauseEn: "Third-party costs such as domains, hosting and payment-gateway fees are paid by the Client.",
    clauseAr: "يتحمّل العميل تكاليف الأطراف الأخرى مثل النطاقات والاستضافة ورسوم بوابات الدفع.",
  },
  {
    slug: "pos-analytics",
    titleEn: "POS Integration & Number Analytics",
    titleAr: "ربط نقاط البيع وتحليلات الأرقام",
    summaryEn: "Selection, setup and integration of POS systems to turn daily sales data into clear weekly financial decisions",
    summaryAr: "اختيار وتهيئة وربط نظام نقاط البيع، لتحويل بيانات مبيعاتك اليومية إلى قرارات مالية أسبوعية واضحة",
    descriptionEn:
      "From vendor selection to menu, modifier and tax setup, we get your POS working with ordering and inventory. Then we build the sales, item-mix and peak-hour views that show what to change.",
    descriptionAr:
      "من اختيار المورّد إلى إعداد القائمة والإضافات والضرائب، نجعل نظام نقاط البيع يعمل مع الطلبات والمخزون. ثم نبني تقارير المبيعات وتشكيلة الأصناف وساعات الذروة التي تبيّن ما ينبغي تغييره.",
    deliverablesEn: [
      "POS selection and vendor coordination",
      "Menu, modifier and tax configuration",
      "Integration with ordering and inventory",
      "Sales, item-mix and peak-hour dashboards",
      "Staff training and handover",
    ],
    deliverablesAr: [
      "اختيار نظام نقاط البيع والتنسيق مع المورّد",
      "إعداد القائمة والإضافات والضرائب",
      "الربط مع الطلبات والمخزون",
      "لوحات المبيعات وتشكيلة الأصناف وساعات الذروة",
      "تدريب الموظفين والتسليم",
    ],
    clauseEn: "POS hardware and software licences are purchased by the Client directly from the vendor.",
    clauseAr: "يشتري العميل أجهزة وتراخيص نظام نقاط البيع مباشرة من المورّد.",
  },
  {
    slug: "content-social",
    titleEn: "Content Management & Digital Marketing",
    titleAr: "إدارة المحتوى والتسويق الرقمي",
    summaryEn: "Strategic planning and diverse monthly content management — carousels, AI videos, static posts, and on-site reels we shoot and publish for you",
    summaryAr: "وضع خطط استراتيجية وإدارة محتوى متنوع شهرياً — كاروسيل، فيديوهات ذكاء اصطناعي، منشورات ثابتة، وريلز ميدانية نصورها وننشرها عنك",
    descriptionEn:
      "Twenty pieces of content every month, on a calendar you approve in advance. We plan, shoot on location, design, write captions in Arabic and English, publish, and report on what performed.",
    descriptionAr:
      "عشرون قطعة محتوى كل شهر، وفق تقويم توافق عليه مسبقًا. نخطّط ونصوّر في الموقع ونصمّم ونكتب النصوص بالعربية والإنجليزية وننشر، ثم نرفع تقريرًا بما حقق أفضل أداء.",
    deliverablesEn: [
      "5 carousel posts every month",
      "5 AI-generated videos every month",
      "5 static posts every month",
      "5 real reels filmed on location every month",
      "Content calendar, captions, publishing and monthly report",
    ],
    deliverablesAr: [
      "5 منشورات كاروسيل كل شهر",
      "5 فيديوهات بالذكاء الاصطناعي كل شهر",
      "5 منشورات ثابتة كل شهر",
      "5 ريلز حقيقية تُصوَّر في الموقع كل شهر",
      "تقويم المحتوى والنصوص والنشر وتقرير شهري",
    ],
    clauseEn:
      "Each month covers 5 carousels, 5 AI videos, 5 static posts and 5 real reels. Each piece includes one round of revisions. Items not approved or used within the month do not carry over.",
    clauseAr:
      "يشمل كل شهر 5 منشورات كاروسيل و5 فيديوهات بالذكاء الاصطناعي و5 منشورات ثابتة و5 ريلز حقيقية. تتضمن كل قطعة جولة تعديلات واحدة. لا تُرحَّل العناصر غير المعتمدة أو غير المستخدمة إلى الشهر التالي.",
  },
  {
    slug: "government-legal",
    titleEn: "Licensing & Government Clearance",
    titleAr: "التراخيص والتخليص الحكومي",
    summaryEn: "Establishing commercial registration and official licenses from start to opening, with continuous follow-up including issuance and renewal of staff residencies, CR renewal, and adding commercial activities",
    summaryAr: "تأسيس السجل التجاري والتراخيص الرسمية من البداية حتى الافتتاح، مع متابعة مستمرة تشمل إصدار وتجديد إقامات العمالة، تجديد السجل، وإضافة الأنشطة التجارية",
    descriptionEn:
      "We prepare, submit and follow up your files with the relevant Bahraini authorities — from commercial registration to health, municipality and civil-defence approvals — and track renewals so nothing lapses.",
    descriptionAr:
      "نُعدّ ملفاتك ونقدّمها ونتابعها لدى الجهات البحرينية المختصة — من السجل التجاري إلى موافقات الصحة والبلدية والدفاع المدني — ونتابع التجديدات حتى لا ينتهي أي ترخيص.",
    deliverablesEn: [
      "Commercial registration (CR) through Sijilat",
      "Municipality and Ministry of Health approvals",
      "Civil Defence and signage permits",
      "LMRA and staff visa coordination",
      "Renewals tracking and compliance reminders",
    ],
    deliverablesAr: [
      "السجل التجاري عبر نظام «سجلات»",
      "موافقات البلدية ووزارة الصحة",
      "تصاريح الدفاع المدني واللوحات الإعلانية",
      "التنسيق مع هيئة تنظيم سوق العمل وتأشيرات الموظفين",
      "متابعة التجديدات وتنبيهات الالتزام",
    ],
    clauseEn:
      "Timelines and decisions are set by the relevant authorities and are outside Luqma's control. Official fees are paid by the Client or billed at cost.",
    clauseAr: "تحدد الجهات المختصة المدد والقرارات وهي خارج سيطرة لقمة. يدفع العميل الرسوم الرسمية أو تُحتسب عليه بالتكلفة.",
  },
];

/** Starting SLA wording for a pillar. Review with legal counsel, then edit in /admin → Contracts. */
export function buildContract(p: Pillar) {
  const bodyEn = `1. Parties
This agreement is between Luqma Restaurant Solutions & Operations, Kingdom of Bahrain ("Luqma"), and the client named on the service request ("the Client").

2. Scope of services
Under this service Luqma will deliver:
${p.deliverablesEn.map((d) => `- ${d}`).join("\n")}
${p.clauseEn}
Work outside this scope is quoted separately and agreed in writing before it starts.

3. Term
The agreement starts when Luqma activates the service request. One-time engagements end on delivery of the agreed scope. Recurring retainers renew each billing period until either party gives 30 days' written notice.

4. Fees and payment
Fees are those shown for the selected package at the time of the request, in Bahraini Dinars (BHD), and are payable in advance for each billing period. Third-party and government charges are billed at cost unless stated otherwise. VAT is added where applicable.

5. Service levels
- Luqma responds to the Client's messages within one working day (Sunday to Thursday).
- Progress updates, reports and deliverables are published in the Client's private portal, and the Client is notified by e-mail.
- Any delay to an agreed date is communicated before that date, with a revised plan.

6. Client responsibilities
The Client provides timely access to premises, staff, systems and information, and reviews submitted work within three working days. Delays in access or approval extend delivery dates by the same period.

7. Confidentiality
Each party keeps the other's commercial, financial and operational information confidential and uses it only to perform this agreement. This obligation continues after the agreement ends.

8. Intellectual property
On full payment, the Client owns the final deliverables produced for it. Luqma retains its methods, templates and tools, and references the engagement in its portfolio only with the Client's consent.

9. Liability
Luqma provides its services with reasonable skill and care. Luqma's total liability under this agreement is limited to the fees paid by the Client in the three months before the claim. Neither party is liable for indirect or consequential loss.

10. Termination
Either party may terminate for a material breach that is not remedied within 14 days of written notice. Fees for work performed up to the termination date remain payable.

11. Governing law
This agreement is governed by the laws of the Kingdom of Bahrain, and the courts of Bahrain have jurisdiction.`;

  const bodyAr = `1. الأطراف
هذه الاتفاقية مبرمة بين لقمة لحلول وتشغيل المطاعم، مملكة البحرين («لقمة»)، والعميل المذكور في طلب الخدمة («العميل»).

2. نطاق الخدمات
تلتزم لقمة ضمن هذه الخدمة بتقديم ما يلي:
${p.deliverablesAr.map((d) => `- ${d}`).join("\n")}
${p.clauseAr}
أي عمل خارج هذا النطاق يُسعَّر بشكل مستقل ويُتفق عليه كتابيًا قبل البدء به.

3. المدة
تبدأ الاتفاقية عند تفعيل لقمة لطلب الخدمة. تنتهي الأعمال لمرة واحدة بتسليم النطاق المتفق عليه. تتجدد الاشتراكات الدورية مع كل فترة فوترة إلى أن يُخطر أحد الطرفين الآخر كتابيًا قبل 30 يومًا.

4. الأتعاب والدفع
الأتعاب هي المبيّنة للباقة المختارة وقت تقديم الطلب بالدينار البحريني، وتُدفع مقدمًا عن كل فترة فوترة. تُحتسب رسوم الأطراف الأخرى والرسوم الحكومية بالتكلفة ما لم يُذكر خلاف ذلك. تُضاف ضريبة القيمة المضافة حيثما تنطبق.

5. مستويات الخدمة
- ترد لقمة على رسائل العميل خلال يوم عمل واحد (من الأحد إلى الخميس).
- تُنشر التحديثات والتقارير والمخرجات في بوابة العميل الخاصة، ويُخطر العميل بالبريد الإلكتروني.
- يُبلَّغ العميل بأي تأخير عن موعد متفق عليه قبل حلوله، مع خطة معدّلة.

6. مسؤوليات العميل
يوفّر العميل في الوقت المناسب إمكانية الوصول إلى المنشأة والموظفين والأنظمة والمعلومات، ويراجع الأعمال المقدّمة خلال ثلاثة أيام عمل. أي تأخير في الوصول أو الاعتماد يمدّد مواعيد التسليم بالمدة نفسها.

7. السرية
يحافظ كل طرف على سرية المعلومات التجارية والمالية والتشغيلية للطرف الآخر ولا يستخدمها إلا لتنفيذ هذه الاتفاقية. يستمر هذا الالتزام بعد انتهاء الاتفاقية.

8. الملكية الفكرية
عند السداد الكامل يملك العميل المخرجات النهائية المنتَجة له. تحتفظ لقمة بأساليبها وقوالبها وأدواتها، ولا تشير إلى العمل في معرض أعمالها إلا بموافقة العميل.

9. المسؤولية
تقدّم لقمة خدماتها بالعناية والمهارة المعقولتين. تقتصر مسؤولية لقمة الإجمالية بموجب هذه الاتفاقية على الأتعاب التي دفعها العميل خلال الأشهر الثلاثة السابقة للمطالبة. لا يتحمّل أي طرف مسؤولية الخسائر غير المباشرة أو التبعية.

10. الإنهاء
يجوز لأي طرف إنهاء الاتفاقية عند إخلال جوهري لم يُعالَج خلال 14 يومًا من الإخطار الكتابي. تبقى أتعاب الأعمال المنجزة حتى تاريخ الإنهاء مستحقة.

11. القانون الواجب التطبيق
تخضع هذه الاتفاقية لقوانين مملكة البحرين، وتختص محاكم البحرين بالنظر في أي نزاع.`;

  return {
    titleEn: `Service-Level Agreement — ${p.titleEn}`,
    titleAr: `اتفاقية مستوى الخدمة — ${p.titleAr}`,
    bodyEn,
    bodyAr,
  };
}

export const PAYMENT_METHOD_DEFAULTS = [
  {
    key: "benefit_qr",
    type: "manual",
    sortOrder: 1,
    nameEn: "BenefitPay (QR code)",
    nameAr: "بنفت بي (رمز QR)",
    instructionsEn: "Open BenefitPay, scan the QR code and pay the exact amount. Then enter the transaction reference so we can confirm your payment.",
    instructionsAr: "افتح تطبيق بنفت بي وامسح رمز QR وادفع المبلغ المحدد. ثم أدخل الرقم المرجعي للعملية لنؤكد دفعتك.",
  },
  {
    key: "bank_transfer",
    type: "manual",
    sortOrder: 2,
    nameEn: "Bank transfer (IBAN)",
    nameAr: "تحويل بنكي (آيبان)",
    instructionsEn: "Transfer the exact amount to the account below, then enter the transfer reference so we can confirm your payment.",
    instructionsAr: "حوّل المبلغ المحدد إلى الحساب أدناه، ثم أدخل الرقم المرجعي للتحويل لنؤكد دفعتك.",
  },
  {
    key: "cash",
    type: "manual",
    sortOrder: 3,
    nameEn: "Cash or cheque",
    nameAr: "نقدًا أو بشيك",
    instructionsEn: "Pay our team in person. We will confirm the payment and issue your receipt.",
    instructionsAr: "ادفع لفريقنا مباشرة. سنؤكد الدفعة ونصدر لك الإيصال.",
  },
  {
    key: "tap",
    type: "gateway",
    sortOrder: 4,
    nameEn: "Card, Benefit debit or Apple Pay",
    nameAr: "بطاقة ائتمان، بطاقة بنفت أو Apple Pay",
    instructionsEn: "You will be taken to Tap's secure payment page and returned here when the payment completes.",
    instructionsAr: "ستنتقل إلى صفحة الدفع الآمنة لدى «تاب» ثم تعود إلى هنا عند اكتمال الدفع.",
  },
  {
    key: "benefit_gateway",
    type: "gateway",
    sortOrder: 5,
    nameEn: "Benefit debit card",
    nameAr: "بطاقة الخصم بنفت",
    instructionsEn: "You will be taken to the BENEFIT payment gateway and returned here when the payment completes.",
    instructionsAr: "ستنتقل إلى بوابة الدفع «بنفت» ثم تعود إلى هنا عند اكتمال الدفع.",
  },
  {
    key: "paypal",
    type: "gateway",
    sortOrder: 6,
    nameEn: "PayPal",
    nameAr: "باي بال",
    instructionsEn: "PayPal does not process Bahraini Dinars, so you will be charged the US Dollar equivalent at the official peg (1 USD = 0.376 BHD).",
    instructionsAr: "لا يدعم باي بال الدينار البحريني، لذلك سيُخصم ما يعادل المبلغ بالدولار الأمريكي وفق سعر الربط الرسمي (1 دولار = 0.376 د.ب).",
  },
] as const;