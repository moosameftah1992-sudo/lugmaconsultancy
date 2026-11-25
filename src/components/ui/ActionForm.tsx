"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import type { ActionResult } from "@/types";

type Action = (fd: FormData) => Promise<ActionResult>;
type Phase = "idle" | "uploading" | "saving";

const PhaseContext = createContext<Phase>("idle");

/**
 * Uploads every chosen file from `<input type="file" data-upload="purpose" name="x">`
 * to the upload API, then replaces the binary with the stored ids as `xIds`.
 * Keeps large files out of the server-action payload.
 */
async function uploadFiles(form: HTMLFormElement, fd: FormData): Promise<void> {
  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("input[type=file][data-upload]"));
  for (const input of inputs) {
    fd.delete(input.name);
    const ids: string[] = [];
    for (const file of Array.from(input.files ?? [])) {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", input.dataset.upload ?? "");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok || !json?.id) throw new Error(json?.error ?? `Upload failed (${res.status})`);
      ids.push(json.id);
    }
    if (ids.length) fd.set(`${input.name}Ids`, ids.join(","));
  }
}

function navigate(router: ReturnType<typeof useRouter>, result: Extract<ActionResult, { ok: true }>) {
  if (result.redirect) {
    if (/^https?:\/\//.test(result.redirect)) {
      window.location.assign(result.redirect);
      return;
    }
    router.push(result.redirect);
  }
  router.refresh();
}

/** Runs a server action from a form and shows its outcome inline. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [state, setState] = useState<{ error?: string; message?: string }>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "idle") return;
    const form = e.currentTarget;
    if (confirm && !window.confirm(confirm)) return;
    const fd = new FormData(form);
    setState({});
    try {
      const hasFiles = Array.from(form.querySelectorAll<HTMLInputElement>("input[type=file][data-upload]")).some((i) => i.files?.length);
      if (hasFiles) setPhase("uploading");
      await uploadFiles(form, fd);
      setPhase("saving");
      const result = await action(fd);
      if (!result.ok) {
        setState({ error: result.error });
        return;
      }
      setState({ message: result.message });
      if (resetOnSuccess) form.reset();
      navigate(router, result);
    } catch (error) {
      setState({
        error:
          error instanceof Error && error.message
            ? error.message
            : t("Something went wrong. Check your connection and try again.", "حدث خطأ. تحقق من اتصالك وحاول مجددًا."),
      });
    } finally {
      setPhase("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <PhaseContext.Provider value={phase}>{children}</PhaseContext.Provider>
      <div aria-live="polite">
        {state.error && (
          <p role="alert" className="lq-fade-in mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="lq-fade-in mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function SubmitButton({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const phase = useContext(PhaseContext);
  const t = useT();
  return (
    <button type="submit" className={className} disabled={phase !== "idle"}>
      {phase === "uploading" ? t("Uploading…", "جارٍ الرفع…") : phase === "saving" ? t("Saving…", "جارٍ الحفظ…") : children}
    </button>
  );
}

/** A single button that runs a server action with fixed fields (delete, toggle, confirm…). */
export function ActionButton({
  action,
  fields,
  children,
  className = "btn btn-ghost btn-sm",
  confirm,
  label,
}: {
  action: Action;
  fields: Record<string, string>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  label?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy || (confirm && !window.confirm(confirm))) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
      const result = await action(fd);
      if (!result.ok) setError(result.error);
      else navigate(router, result);
    } catch {
      setError(t("Something went wrong. Try again.", "حدث خطأ. حاول مجددًا."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={run} disabled={busy} className={className} aria-label={label} aria-busy={busy}>
        {children}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-[13px] leading-snug text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
