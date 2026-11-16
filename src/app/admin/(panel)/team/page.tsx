import { asc, desc } from "drizzle-orm";
import { LockKeyhole } from "lucide-react";
import { CheckField, Disclosure, Field, PageHeader, Panel } from "@/components/admin/parts";
import { ActionButton, ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { bi, makeT, type TFn } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createAdmin, deleteAdmin, updateAdmin } from "@/server/actions/admin-misc";
import { PERMISSION_LABELS, PERMISSIONS, type Permission } from "@/types";

function PermissionChecks({ t, selected, canGrantAdmins }: { t: TFn; selected: Permission[]; canGrantAdmins: boolean }) {
  return (
    <fieldset>
      <legend className="label">{t("Permissions", "الصلاحيات")}</legend>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {PERMISSIONS.filter((p) => p !== "admins" || canGrantAdmins).map((p) => (
          <CheckField key={p} name="permissions" value={p} label={bi(t, PERMISSION_LABELS[p])} defaultChecked={selected.includes(p)} />
        ))}
      </div>
      {!canGrantAdmins && <p className="hint">{t("Only the master admin can grant access to admin accounts.", "المشرف الرئيسي وحده يمنح صلاحية إدارة حسابات المشرفين.")}</p>}
    </fieldset>
  );
}

export default async function TeamAdminPage() {
  const me = await requireAdmin("admins");
  const locale = await getLocale();
  const t = makeT(locale);
  const rows = await db.select().from(admins).orderBy(desc(admins.isMaster), asc(admins.createdAt));

  return (
    <>
      <PageHeader
        title={t("Admin accounts", "حسابات المشرفين")}
        description={t(
          "Give each team member their own sign-in and only the sections they need. The master account always has full access and cannot be edited or removed.",
          "امنح كل عضو في الفريق حسابه الخاص والأقسام التي يحتاجها فقط. للحساب الرئيسي صلاحية كاملة دائمًا ولا يمكن تعديله أو حذفه.",
        )}
      />

      <Disclosure summary={t("+ Add an admin account", "+ إضافة حساب مشرف")}>
        <ActionForm action={createAdmin} resetOnSuccess className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Full name", "الاسم الكامل")} name="name" required maxLength={120} />
            <Field label={t("E-mail (optional)", "البريد الإلكتروني (اختياري)")} name="email" type="email" dir="ltr" maxLength={200} />
            <Field label={t("Username", "اسم المستخدم")} name="username" dir="ltr" required minLength={3} maxLength={40} autoComplete="off" hint={t("Letters, numbers, dots, dashes and underscores.", "حروف وأرقام ونقاط وشرطات.")} />
            <Field label={t("Password", "كلمة المرور")} name="password" dir="ltr" required minLength={8} autoComplete="new-password" hint={t("At least 8 characters with letters and numbers.", "8 أحرف على الأقل تتضمن حروفًا وأرقامًا.")} />
          </div>
          <PermissionChecks t={t} selected={[]} canGrantAdmins={me.isMaster} />
          <SubmitButton>{t("Create admin", "إنشاء المشرف")}</SubmitButton>
        </ActionForm>
      </Disclosure>

      <ul className="mt-8 space-y-4">
        {rows.map((a) => {
          const locked = a.isMaster;
          const self = a.id === me.id;
          return (
            <li key={a.id}>
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold text-navy-900">
                      {a.name}
                      {locked && (
                        <Badge tone="amber">
                          <LockKeyhole className="size-3" aria-hidden="true" />
                          {t("Master — protected", "رئيسي — محمي")}
                        </Badge>
                      )}
                      {self && <Badge tone="blue">{t("You", "أنت")}</Badge>}
                      {!a.isActive && <Badge tone="red">{t("Deactivated", "معطّل")}</Badge>}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      <span dir="ltr">@{a.username}</span>
                      {a.email ? ` · ${a.email}` : ""} · {t("Last sign-in", "آخر دخول")}: {a.lastLoginAt ? formatDateTime(a.lastLoginAt, locale) : t("never", "لم يدخل بعد")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {locked ? (
                        <Badge tone="green">{t("Full access to every section", "صلاحية كاملة لكل الأقسام")}</Badge>
                      ) : a.permissions.length === 0 ? (
                        <Badge>{t("Overview only", "النظرة العامة فقط")}</Badge>
                      ) : (
                        a.permissions.map((p) => <Badge key={p}>{bi(t, PERMISSION_LABELS[p] ?? [p, p])}</Badge>)
                      )}
                    </div>
                  </div>
                  {!locked && !self && (
                    <ActionButton
                      action={deleteAdmin}
                      fields={{ id: a.id }}
                      className="btn btn-danger btn-sm"
                      confirm={t(`Delete the admin account “${a.username}”?`, `حذف حساب المشرف «${a.username}»؟`)}
                    >
                      {t("Delete", "حذف")}
                    </ActionButton>
                  )}
                </div>

                {locked ? (
                  <p className="mt-4 text-[13px] leading-relaxed text-muted">
                    {t("This account cannot be modified or deleted from here. Its owner can change the password under Settings.", "لا يمكن تعديل هذا الحساب أو حذفه من هنا. يستطيع صاحبه تغيير كلمة المرور من الإعدادات.")}
                  </p>
                ) : self ? (
                  <p className="mt-4 text-[13px] leading-relaxed text-muted">
                    {t("You cannot change your own permissions. Change your password under Settings.", "لا يمكنك تعديل صلاحياتك بنفسك. غيّر كلمة مرورك من الإعدادات.")}
                  </p>
                ) : (
                  <div className="mt-4">
                    <Disclosure summary={t("Edit access", "تعديل الصلاحيات")}>
                      <ActionForm action={updateAdmin} className="space-y-4">
                        <input type="hidden" name="id" value={a.id} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label={t("Full name", "الاسم الكامل")} name="name" required maxLength={120} defaultValue={a.name} />
                          <Field label={t("E-mail (optional)", "البريد الإلكتروني (اختياري)")} name="email" type="email" dir="ltr" maxLength={200} defaultValue={a.email} />
                          <Field label={t("New password (optional)", "كلمة مرور جديدة (اختياري)")} name="password" dir="ltr" minLength={8} autoComplete="new-password" hint={t("Leave empty to keep the current password.", "اتركه فارغًا للإبقاء على كلمة المرور الحالية.")} />
                        </div>
                        <PermissionChecks t={t} selected={a.permissions} canGrantAdmins={me.isMaster} />
                        <CheckField name="isActive" label={t("Account is active (can sign in)", "الحساب مفعّل (يمكنه الدخول)")} defaultChecked={a.isActive} />
                        <SubmitButton>{t("Save access", "حفظ الصلاحيات")}</SubmitButton>
                      </ActionForm>
                    </Disclosure>
                  </div>
                )}
              </Panel>
            </li>
          );
        })}
      </ul>
    </>
  );
}
