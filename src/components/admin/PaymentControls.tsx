"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { togglePaymentMethod } from "@/server/actions/payments";

/**
 * Enable / disable switch for a payment channel. The change is saved immediately;
 * a disabled channel is gone from customer checkout on the very next page load.
 * The server refuses to enable a channel that cannot take payments yet.
 */
export function PaymentToggle({ methodKey, enabled, name }: { methodKey: string; enabled: boolean; name: string }) {
  const t = useT();
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error?: string; message?: string }>({});

  async function toggle() {
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    setNote({});
    try {
      const fd = new FormData();
      fd.set("key", methodKey);
      fd.set("enabled", next ? "1" : "0");
      const result = await togglePaymentMethod(fd);
      if (!result.ok) {
        setOn(!next);
        setNote({ error: result.error });
      } else {
        setNote({ message: result.message });
        router.refresh();
      }
    } catch {
      setOn(!next);
      setNote({ error: t("Could not save. Try again.", "تعذّر الحفظ. حاول مجددًا.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t(`${name}: show on customer checkout`, `${name}: عرض في صفحة الدفع للعملاء`)}
        onClick={toggle}
        disabled={busy}
        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-full ps-3 disabled:cursor-wait"
      >
        <span className={`text-sm font-medium ${on ? "text-emerald-700" : "text-muted"}`}>{on ? t("Enabled", "مفعّلة") : t("Disabled", "معطّلة")}</span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-emerald-600" : "bg-navy-200"}`}>
          <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all duration-200 ${on ? "start-[1.375rem]" : "start-0.5"}`} />
        </span>
      </button>
      <span aria-live="polite" className="max-w-64 text-end text-[13px] leading-snug">
        {note.error && <span className="text-red-700">{note.error}</span>}
        {note.message && <span className="text-emerald-700">{note.message}</span>}
      </span>
    </div>
  );
}

export function CopyField({ value, label }: { value: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-2">
        <code dir="ltr" className="block min-w-0 flex-1 overflow-x-auto rounded-xl border border-line bg-navy-50 px-3 py-2.5 text-[13px] whitespace-nowrap text-navy-800">
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard unavailable — the value stays selectable */
            }
          }}
          className="btn btn-ghost btn-sm shrink-0"
          aria-label={t("Copy to clipboard", "نسخ")}
        >
          {copied ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? t("Copied", "تم النسخ") : t("Copy", "نسخ")}
        </button>
      </div>
    </div>
  );
}
