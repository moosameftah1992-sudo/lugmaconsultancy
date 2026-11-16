"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useT } from "@/i18n/client";

/** Client sign-in / registration. New accounts start as "awaiting activation". */
export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const register = mode === "register";
  const query = next !== "/portal" ? `?next=${encodeURIComponent(next)}` : "";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      if (res.ok) {
        window.location.assign(next);
        return;
      }
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? t("Something went wrong. Please try again.", "حدث خطأ. يرجى المحاولة مجددًا."));
    } catch {
      setError(t("You appear to be offline. Check your connection and try again.", "يبدو أنك غير متصل. تحقق من اتصالك وحاول مجددًا."));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 shadow-soft sm:p-8">
      <h1 className="text-2xl font-semibold text-navy-900">{register ? t("Create your client account", "أنشئ حساب العميل") : t("Sign in to your portal", "سجّل الدخول إلى بوابتك")}</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
        {register
          ? t("Request services and follow every update, report and deliverable in one private place.", "اطلب الخدمات وتابع كل تحديث وتقرير ومُخرَج في مكان خاص واحد.")
          : t("Updates, reports and deliverables for your services with Luqma.", "التحديثات والتقارير والمخرجات لخدماتك مع لقمة.")}
      </p>

      <div className="mt-6 space-y-4">
        {register && (
          <>
            <div>
              <label htmlFor="af-name" className="label">
                {t("Your full name", "اسمك الكامل")}
              </label>
              <input id="af-name" name="name" className="input" required minLength={2} maxLength={120} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="af-business" className="label">
                {t("Restaurant or business name", "اسم المطعم أو المنشأة")}
              </label>
              <input id="af-business" name="businessName" className="input" maxLength={160} autoComplete="organization" />
            </div>
            <div>
              <label htmlFor="af-phone" className="label">
                {t("Phone or WhatsApp", "الهاتف أو واتساب")}
              </label>
              <input id="af-phone" name="phone" type="tel" dir="ltr" className="input" maxLength={40} autoComplete="tel" placeholder="+973" />
            </div>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="af-website">Website</label>
              <input id="af-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
          </>
        )}
        <div>
          <label htmlFor="af-email" className="label">
            {t("E-mail", "البريد الإلكتروني")}
          </label>
          <input id="af-email" name="email" type="email" dir="ltr" className="input" required maxLength={200} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="af-password" className="label">
            {t("Password", "كلمة المرور")}
          </label>
          <input
            id="af-password"
            name="password"
            type="password"
            dir="ltr"
            className="input"
            required
            minLength={register ? 8 : undefined}
            autoComplete={register ? "new-password" : "current-password"}
            aria-describedby={register ? "af-password-hint" : undefined}
          />
          {register && (
            <p id="af-password-hint" className="hint">
              {t("At least 8 characters, with letters and numbers.", "8 أحرف على الأقل تتضمن حروفًا وأرقامًا.")}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="lq-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
        {busy ? t("One moment…", "لحظة من فضلك…") : register ? t("Create account", "إنشاء الحساب") : t("Sign in", "تسجيل الدخول")}
      </button>

      <p className="mt-5 text-center text-sm text-muted">
        {register ? t("Already have an account?", "لديك حساب بالفعل؟") : t("New to Luqma?", "جديد في لقمة؟")}{" "}
        <Link href={register ? `/portal/login${query}` : `/portal/register${query}`} className="font-medium text-emerald-700 underline underline-offset-4">
          {register ? t("Sign in", "سجّل الدخول") : t("Create a client account", "أنشئ حساب عميل")}
        </Link>
      </p>
      {!register && (
        <p className="mt-2 text-center text-[13px] text-muted">
          {t("Forgot your password? Contact Luqma and we will reset it for you.", "نسيت كلمة المرور؟ تواصل مع لقمة وسنعيد تعيينها لك.")}
        </p>
      )}
    </form>
  );
}
