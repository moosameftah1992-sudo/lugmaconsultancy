import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { CheckField, Disclosure, Empty, Field, PageHeader, Panel, SelectField } from "@/components/admin/parts";
import { ActionButton, ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/misc";
import { db } from "@/db";
import { clients, orders } from "@/db/schema";
import { bi, makeT } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient, deleteClient, resetClientPassword, setClientStatus, updateClient } from "@/server/actions/clients";
import { biLabel, CLIENT_STATUSES, LABELS } from "@/types";

export default async function ClientsAdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("clients");
  const locale = await getLocale();
  const t = makeT(locale);
  const { status } = await searchParams;

  const all = await db
    .select({ client: clients, orderCount: sql<number>`(select count(*)::int from ${orders} where ${orders.clientId} = ${clients.id})` })
    .from(clients)
    .orderBy(desc(clients.createdAt));
  const filter = (CLIENT_STATUSES as readonly string[]).includes(status ?? "") ? status : undefined;
  const rows = filter ? all.filter((r) => r.client.status === filter) : all;
  const tabs: Array<[string | undefined, string, number]> = [
    [undefined, t("All", "الكل"), all.length],
    ...CLIENT_STATUSES.map((s): [string, string, number] => [s, bi(t, LABELS.clientStatus[s]), all.filter((r) => r.client.status === s).length]),
  ];

  return (
    <>
      <PageHeader
        title={t("Clients", "العملاء")}
        description={t(
          "Activate new registrations to unlock their private dashboard. Activation sends the client a welcome e-mail.",
          "فعّل التسجيلات الجديدة لفتح لوحاتهم الخاصة. يرسل التفعيل بريدًا ترحيبيًا للعميل.",
        )}
      />

      <Disclosure summary={t("+ Add a client account", "+ إضافة حساب عميل")}>
        <ActionForm action={createClient} resetOnSuccess className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Contact name", "اسم جهة الاتصال")} name="name" required maxLength={120} />
            <Field label={t("Restaurant / business", "المطعم / المنشأة")} name="businessName" maxLength={160} />
            <Field label={t("E-mail (used to sign in)", "البريد الإلكتروني (لتسجيل الدخول)")} name="email" type="email" dir="ltr" required maxLength={200} />
            <Field label={t("Phone", "الهاتف")} name="phone" type="tel" dir="ltr" maxLength={40} />
            <Field
              label={t("Temporary password", "كلمة مرور مؤقتة")}
              name="password"
              dir="ltr"
              required
              minLength={8}
              autoComplete="new-password"
              hint={t("At least 8 characters with letters and numbers. Share it with the client securely.", "8 أحرف على الأقل تتضمن حروفًا وأرقامًا. شاركها مع العميل بطريقة آمنة.")}
            />
            <SelectField
              label={t("Preferred language", "اللغة المفضلة")}
              name="locale"
              defaultValue={locale}
              options={[
                ["en", "English"],
                ["ar", "العربية"],
              ]}
              hint={t("Used for e-mail notifications.", "تُستخدم في إشعارات البريد الإلكتروني.")}
            />
          </div>
          <CheckField name="activate" label={t("Activate immediately and send the welcome e-mail", "التفعيل فورًا وإرسال البريد الترحيبي")} defaultChecked />
          <SubmitButton>{t("Create client", "إنشاء العميل")}</SubmitButton>
        </ActionForm>
      </Disclosure>

      <nav aria-label={t("Filter by status", "التصفية حسب الحالة")} className="mt-8 mb-4 flex flex-wrap gap-2">
        {tabs.map(([value, label, count]) => (
          <Link
            key={label}
            href={value ? `/admin/clients?status=${value}` : "/admin/clients"}
            aria-current={filter === value ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
              filter === value ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-navy-800 hover:border-navy-300"
            }`}
          >
            {label}
            <span className="tabular-nums opacity-70">{count}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Empty
          title={all.length === 0 ? t("No clients yet", "لا يوجد عملاء بعد") : t("No clients with this status", "لا يوجد عملاء بهذه الحالة")}
          body={all.length === 0 ? t("Clients appear here when they register on the website, or when you add them above.", "يظهر العملاء هنا عند تسجيلهم في الموقع أو عند إضافتهم من الأعلى.") : undefined}
        />
      ) : (
        <ul className="space-y-4">
          {rows.map(({ client: c, orderCount }) => (
            <li key={c.id}>
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold text-navy-900">
                      {c.businessName || c.name}
                      <Badge status={c.status}>{bi(t, biLabel("clientStatus", c.status))}</Badge>
                    </p>
                    <p className="mt-1 text-sm text-navy-800">
                      {c.businessName ? `${c.name} · ` : ""}
                      <a href={`mailto:${c.email}`} dir="ltr" className="text-emerald-700 hover:underline">
                        {c.email}
                      </a>
                      {c.phone && (
                        <>
                          {" · "}
                          <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="text-emerald-700 hover:underline">
                            {c.phone}
                          </a>
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">
                      {t("Registered", "سُجّل في")} {formatDate(c.createdAt, locale)} · {t(`${orderCount} order(s)`, `${orderCount} طلب`)}
                      {orderCount > 0 && (
                        <>
                          {" · "}
                          <Link href={`/admin/orders?client=${c.id}`} className="text-emerald-700 hover:underline">
                            {t("View orders", "عرض الطلبات")}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.status !== "active" && (
                      <ActionButton action={setClientStatus} fields={{ id: c.id, status: "active" }} className="btn btn-accent btn-sm">
                        {c.status === "pending" ? t("Activate account", "تفعيل الحساب") : t("Reactivate", "إعادة التفعيل")}
                      </ActionButton>
                    )}
                    {c.status !== "suspended" && (
                      <ActionButton
                        action={setClientStatus}
                        fields={{ id: c.id, status: "suspended" }}
                        className="btn btn-danger btn-sm"
                        confirm={t("Suspend this client? They will be signed out and unable to sign in.", "إيقاف هذا العميل؟ سيُسجَّل خروجه ولن يتمكن من الدخول.")}
                      >
                        {t("Suspend", "إيقاف")}
                      </ActionButton>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <Disclosure summary={t("Manage account", "إدارة الحساب")}>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <ActionForm action={updateClient} className="space-y-4">
                        <input type="hidden" name="id" value={c.id} />
                        <Field label={t("Contact name", "اسم جهة الاتصال")} name="name" required maxLength={120} defaultValue={c.name} />
                        <Field label={t("Restaurant / business", "المطعم / المنشأة")} name="businessName" maxLength={160} defaultValue={c.businessName} />
                        <Field label={t("Phone", "الهاتف")} name="phone" type="tel" dir="ltr" maxLength={40} defaultValue={c.phone} />
                        <Field label={t("Internal notes (never shown to the client)", "ملاحظات داخلية (لا تظهر للعميل)")} name="adminNotes" textarea rows={3} defaultValue={c.adminNotes} />
                        <SubmitButton>{t("Save details", "حفظ البيانات")}</SubmitButton>
                      </ActionForm>
                      <div className="space-y-6">
                        <ActionForm action={resetClientPassword} resetOnSuccess className="space-y-4">
                          <input type="hidden" name="id" value={c.id} />
                          <Field
                            label={t("Set a new password", "تعيين كلمة مرور جديدة")}
                            name="password"
                            dir="ltr"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            hint={t("The client is signed out everywhere and must use the new password.", "يُسجَّل خروج العميل من كل الأجهزة ويجب أن يستخدم الكلمة الجديدة.")}
                          />
                          <SubmitButton className="btn btn-ghost">{t("Reset password", "إعادة تعيين كلمة المرور")}</SubmitButton>
                        </ActionForm>
                        {orderCount === 0 && (
                          <ActionButton
                            action={deleteClient}
                            fields={{ id: c.id }}
                            className="btn btn-danger btn-sm"
                            confirm={t("Delete this client account permanently?", "حذف حساب هذا العميل نهائيًا؟")}
                          >
                            {t("Delete account", "حذف الحساب")}
                          </ActionButton>
                        )}
                      </div>
                    </div>
                  </Disclosure>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
