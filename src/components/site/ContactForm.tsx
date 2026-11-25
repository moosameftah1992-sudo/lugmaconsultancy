"use client";

import { CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useT } from "@/i18n/client";

/** "Book a consultation" form. Posts to /api/inquiries; messages land in the admin inbox. */
export function ContactForm({ services, defaultService }: { services: Array<{ slug: string; title: string }>; defaultService?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(json?.error ?? t("We could not send your message. Please try again.", "تعذّر إرسال رسالتك. يرجى المحاولة مجددًا."));
      else setSent(true);
    } catch {
      setError(t("You appear to be offline. Check your connection and try again.", "يبدو أنك غير متصل. تحقق من اتصالك وحاول مجددًا."));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="lq-fade-in flex h-full min-h-72 flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CircleCheck className="size-10 text-emerald-600" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-semibold text-navy-900">{t("Message received", "تم استلام رسالتك")}</h3>
        <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-navy-800">
          {t("Thank you. A member of the Luqma team will get back to you within one working day.", "شكرًا لك. سيتواصل معك أحد أعضاء فريق لقمة خلال يوم عمل واحد.")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 shadow-soft sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="label">
            {t("Your name", "اسمك")}
          </label>
          <input id="cf-name" name="name" className="input" required minLength={2} maxLength={120} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="cf-business" className="label">
            {t("Restaurant or business", "المطعم أو المنشأة")}
          </label>
          <input id="cf-business" name="business" className="input" maxLength={160} autoComplete="organization" />
        </div>
        <div>
          <label htmlFor="cf-email" className="label">
            {t("E-mail", "البريد الإلكتروني")}
          </label>
          <input id="cf-email" name="email" type="email" dir="ltr" className="input" required maxLength={200} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="cf-phone" className="label">
            {t("Phone or WhatsApp", "الهاتف أو واتساب")}
          </label>
          <input id="cf-phone" name="phone" type="tel" dir="ltr" className="input" maxLength={40} autoComplete="tel" placeholder="+973" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cf-service" className="label">
            {t("What do you need help with?", "بماذا تحتاج المساعدة؟")}
          </label>
          <select id="cf-service" name="service" className="input" defaultValue={defaultService ?? ""}>
            <option value="">{t("Not sure yet — advise me", "لست متأكدًا بعد — أشيروا عليّ")}</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cf-message" className="label">
            {t("Tell us about your restaurant", "حدّثنا عن مطعمك")}
          </label>
          <textarea id="cf-message" name="message" className="input min-h-32" required minLength={10} maxLength={3000} />
        </div>
        {/* Honeypot — hidden from people, tempting for bots. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="cf-website">Website</label>
          <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-amber mt-6 w-full sm:w-auto" disabled={busy}>
        {busy ? t("Sending…", "جارٍ الإرسال…") : t("Book a consultation", "احجز استشارة")}
      </button>
    </form>
  );
}
