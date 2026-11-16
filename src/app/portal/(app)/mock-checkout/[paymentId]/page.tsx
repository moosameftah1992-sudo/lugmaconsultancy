import { and, eq, inArray } from "drizzle-orm";
import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/ActionForm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { makeT } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireClient } from "@/lib/auth/session";
import { listCheckoutMethods } from "@/lib/data";
import { formatBhd, isUuid, orderRef } from "@/lib/format";
import { completeMockPayment } from "@/server/actions/portal";

type Props = { params: Promise<{ paymentId: string }>; searchParams: Promise<{ method?: string }> };

/**
 * Stand-in for a hosted payment page while a gateway is in mock mode. It only exists
 * for channels an admin has enabled in mock mode, and never moves real money.
 */
export default async function MockCheckoutPage({ params, searchParams }: Props) {
  const { paymentId } = await params;
  const { method: methodKey } = await searchParams;
  const client = await requireClient();
  if (!isUuid(paymentId)) notFound();
  const locale = await getLocale();
  const t = makeT(locale);

  const [row] = await db
    .select({ payment: payments, number: orders.number })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(and(eq(payments.id, paymentId), eq(payments.clientId, client.id), inArray(payments.status, ["due", "failed"])))
    .limit(1);
  const method = (await listCheckoutMethods(locale)).find((m) => m.key === methodKey && m.type === "gateway" && m.mode === "mock");
  if (!row || !method) notFound();

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 text-center shadow-soft sm:p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-amber-100 text-amber-700">
          <FlaskConical className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-[13px] font-semibold tracking-[0.14em] text-amber-700 uppercase">{t("Test checkout", "دفع تجريبي")}</p>
        <h1 className="mt-2 text-xl font-semibold text-navy-900">{method.name}</h1>
        <p className="mt-4 text-3xl font-semibold text-navy-900 tabular-nums">{formatBhd(row.payment.amountBhd, locale)}</p>
        <p className="mt-1 text-sm text-muted">
          <span dir="ltr">{orderRef(row.number)}</span>
          {row.payment.label ? ` · ${row.payment.label}` : ""}
        </p>
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">
          {t(
            "This payment method is in test mode. No real money moves — choose an outcome to see how the order responds.",
            "وسيلة الدفع هذه في الوضع التجريبي. لا تُحوَّل أي أموال حقيقية — اختر نتيجة لترى كيف يستجيب الطلب.",
          )}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <ActionButton action={completeMockPayment} fields={{ paymentId, methodKey: method.key, outcome: "paid" }} className="btn btn-accent w-64 max-w-full">
            {t("Simulate successful payment", "محاكاة دفع ناجح")}
          </ActionButton>
          <ActionButton action={completeMockPayment} fields={{ paymentId, methodKey: method.key, outcome: "failed" }} className="btn btn-ghost w-64 max-w-full">
            {t("Simulate failed payment", "محاكاة دفع فاشل")}
          </ActionButton>
          <Link href={`/portal/orders/${row.payment.orderId}`} className="mt-1 inline-flex min-h-10 items-center text-sm font-medium text-navy-700 hover:underline">
            {t("Cancel and go back", "إلغاء والعودة")}
          </Link>
        </div>
      </div>
    </div>
  );
}
