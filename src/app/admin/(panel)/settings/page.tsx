import { desc } from "drizzle-orm";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Field, PageHeader, Panel } from "@/components/admin/parts";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { emailLog } from "@/db/schema";
import { makeT } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { can, requireAdmin } from "@/lib/auth/session";
import { emailConfigured } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { getSiteSettings } from "@/lib/site";
import { changeOwnPassword, saveSiteSettings } from "@/server/actions/admin-misc";

export default async function SettingsAdminPage() {
  const admin = await requireAdmin();
  const locale = await getLocale();
  const t = makeT(locale);
  const manage = can(admin, "settings");
  const [site, log] = await Promise.all([getSiteSettings(), manage ? db.select().from(emailLog).orderBy(desc(emailLog.createdAt)).limit(15) : []]);
  const smtp = emailConfigured();
  const statusLabel: Record<string, string> = {
    sent: t("Sent", "أُرسل"),
    failed: t("Failed", "فشل"),
    not_configured: t("Not sent — SMTP missing", "لم يُرسل — SMTP غير مُعد"),
  };

  return (
    <>
      <PageHeader title={t("Settings", "الإعدادات")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("Your password", "كلمة مرورك")} description={t(`Signed in as @${admin.username}. Changing it signs you out on other devices.`, `تم الدخول باسم @${admin.username}. تغييرها يسجّل خروجك من الأجهزة الأخرى.`)}>
          <ActionForm action={changeOwnPassword} resetOnSuccess className="space-y-4">
            <Field label={t("Current password", "كلمة المرور الحالية")} name="current" type="password" dir="ltr" required autoComplete="current-password" />
            <Field label={t("New password", "كلمة المرور الجديدة")} name="next" type="password" dir="ltr" required minLength={8} autoComplete="new-password" hint={t("At least 8 characters with letters and numbers.", "8 أحرف على الأقل تتضمن حروفًا وأرقامًا.")} />
            <Field label={t("Repeat the new password", "أعد كتابة كلمة المرور الجديدة")} name="confirm" type="password" dir="ltr" required minLength={8} autoComplete="new-password" />
            <SubmitButton>{t("Change password", "تغيير كلمة المرور")}</SubmitButton>
          </ActionForm>
        </Panel>

        {manage && (
          <Panel title={t("Public contact details", "بيانات التواصل العامة")} description={t("Shown in the website footer. Empty fields are simply left out.", "تظهر في تذييل الموقع. الحقول الفارغة لا تُعرض.")}>
            <ActionForm action={saveSiteSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("E-mail", "البريد الإلكتروني")} name="email" type="email" dir="ltr" maxLength={200} defaultValue={site.email} />
                <Field label={t("Phone", "الهاتف")} name="phone" type="tel" dir="ltr" maxLength={40} placeholder="+973" defaultValue={site.phone} />
                <Field label={t("WhatsApp number", "رقم واتساب")} name="whatsapp" type="tel" dir="ltr" maxLength={40} placeholder="+973" defaultValue={site.whatsapp} hint={t("International format, digits only.", "بالصيغة الدولية، أرقام فقط.")} />
                <Field label={t("Instagram username", "اسم المستخدم في إنستغرام")} name="instagram" dir="ltr" maxLength={60} defaultValue={site.instagram} />
                <Field label={t("Address (English)", "العنوان (بالإنجليزية)")} name="addressEn" dir="ltr" maxLength={200} defaultValue={site.addressEn} />
                <Field label={t("Address (Arabic)", "العنوان (بالعربية)")} name="addressAr" dir="rtl" maxLength={200} defaultValue={site.addressAr} />
              </div>
              <SubmitButton>{t("Save contact details", "حفظ بيانات التواصل")}</SubmitButton>
            </ActionForm>
          </Panel>
        )}
      </div>

      {manage && (
        <div className="mt-6">
          <Panel title={t("E-mail notifications", "إشعارات البريد الإلكتروني")}>
            {smtp ? (
              <p className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t("SMTP is configured. Clients are e-mailed when a report is published, an account is activated or a payment is confirmed.", "تم إعداد SMTP. يصل العملاء بريد عند نشر تقرير أو تفعيل حساب أو تأكيد دفعة.")}
              </p>
            ) : (
              <p className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {t(
                    "SMTP is not configured, so no e-mail is being sent. Set these environment variables on the server and restart:",
                    "لم يتم إعداد SMTP، لذلك لا يُرسل أي بريد. اضبط متغيرات البيئة التالية على الخادم ثم أعد التشغيل:",
                  )}{" "}
                  <code dir="ltr" className="text-[13px]">
                    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
                  </code>
                </span>
              </p>
            )}

            <h3 className="mt-6 mb-2 text-sm font-semibold text-navy-900">{t("Recent delivery log", "سجل الإرسال الأخير")}</h3>
            {log.length === 0 ? (
              <p className="text-sm text-muted">{t("No notifications have been triggered yet.", "لم تُرسل أي إشعارات بعد.")}</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="text-[13px] text-muted">
                      <th className="px-2 py-2 text-start font-medium">{t("When", "الوقت")}</th>
                      <th className="px-2 py-2 text-start font-medium">{t("To", "إلى")}</th>
                      <th className="px-2 py-2 text-start font-medium">{t("Subject", "الموضوع")}</th>
                      <th className="px-2 py-2 text-start font-medium">{t("Status", "الحالة")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {log.map((e) => (
                      <tr key={e.id}>
                        <td className="px-2 py-2.5 whitespace-nowrap text-navy-800">{formatDateTime(e.createdAt, locale)}</td>
                        <td className="px-2 py-2.5" dir="ltr">
                          {e.toEmail}
                        </td>
                        <td className="px-2 py-2.5 text-navy-800" dir="auto">
                          {e.subject}
                          {e.error && <span className="block text-[13px] text-red-700">{e.error}</span>}
                        </td>
                        <td className="px-2 py-2.5">
                          <Badge status={e.status}>{statusLabel[e.status] ?? e.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
