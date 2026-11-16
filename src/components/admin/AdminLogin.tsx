"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageToggle } from "@/components/ui/misc";
import { useT } from "@/i18n/client";

/**
 * Admin sign-in. Rendered only at /admin — no public or client page links here.
 * Credentials are verified server-side (scrypt hash, rate-limited); on success the
 * server sets an httpOnly session cookie.
 */
export function AdminLogin() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
      });
      if (res.ok) {
        window.location.assign("/admin/overview");
        return;
      }
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? t("Sign-in failed. Please try again.", "تعذّر تسجيل الدخول. يرجى المحاولة مجددًا."));
    } catch {
      setError(t("You appear to be offline. Check your connection and try again.", "يبدو أنك غير متصل. تحقق من اتصالك وحاول مجددًا."));
    }
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between">
          <Logo />
          <LanguageToggle />
        </div>

        <form onSubmit={onSubmit} className="card mt-8 p-6 shadow-soft sm:p-8">
          <span className="grid size-11 place-items-center rounded-full bg-navy-50 text-navy-800">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-navy-900">{t("Management sign-in", "دخول الإدارة")}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("Authorised Luqma staff only.", "لموظفي لقمة المصرّح لهم فقط.")}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="al-username" className="label">
                {t("Username", "اسم المستخدم")}
              </label>
              <input id="al-username" name="username" dir="ltr" className="input" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
            </div>
            <div>
              <label htmlFor="al-password" className="label">
                {t("Password", "كلمة المرور")}
              </label>
              <div className="relative">
                <input
                  id="al-password"
                  name="password"
                  dir="ltr"
                  type={reveal ? "text" : "password"}
                  className="input pe-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setReveal(!reveal)}
                  className="absolute end-1 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-navy-500 hover:bg-navy-50"
                  aria-label={reveal ? t("Hide password", "إخفاء كلمة المرور") : t("Show password", "إظهار كلمة المرور")}
                  aria-pressed={reveal}
                >
                  {reveal ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="lq-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
            {busy ? t("Signing in…", "جارٍ الدخول…") : t("Sign in", "تسجيل الدخول")}
          </button>
        </form>
      </div>
    </main>
  );
}
