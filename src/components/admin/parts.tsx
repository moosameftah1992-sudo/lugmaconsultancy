import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";

/** Server-rendered building blocks shared by the admin screens. */

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ title, description, children, aside }: { title?: string; description?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      {(title || aside) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold text-navy-900">{title}</h2>}
            {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

interface FieldProps {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  hint?: string;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "email" | "url";
  autoComplete?: string;
  min?: number;
  max?: number;
  className?: string;
}

export function Field({ label, hint, textarea, rows = 3, className = "", defaultValue, ...rest }: FieldProps) {
  const id = useId();
  const value = defaultValue ?? undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {rest.required && <span className="text-red-600"> *</span>}
      </label>
      {textarea ? (
        <textarea id={id} rows={rows} defaultValue={value} className="input" aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      ) : (
        <input id={id} defaultValue={value} className="input" aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
  hint,
  className = "",
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options?: Array<[string, string]>;
  hint?: string;
  className?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} className="input">
        {children}
        {options?.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function CheckField({ label, name, defaultChecked, hint, value }: { label: string; name: string; defaultChecked?: boolean; hint?: string; value?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input id={id} type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="check mt-0.5" />
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-navy-800">
        {label}
        {hint && <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>}
      </label>
    </div>
  );
}

/** Collapsible block used for inline "edit" forms. */
export function Disclosure({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-line bg-white">
      <summary className="flex min-h-11 items-center justify-between gap-3 px-4 py-2 text-sm font-medium text-navy-800 marker:content-none hover:bg-navy-50/60">
        <span className="min-w-0">{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-navy-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-line p-4 sm:p-5">{children}</div>
    </details>
  );
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-12 text-center">
      <p className="font-medium text-navy-900">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">{body}</p>}
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, note, tone = "navy" }: { label: string; value: string; note?: string; tone?: "navy" | "green" | "red" | "amber" }) {
  const color = { navy: "text-navy-900", green: "text-emerald-700", red: "text-red-700", amber: "text-amber-700" }[tone];
  return (
    <div className="card p-5">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p dir="ltr" className={`mt-2 text-2xl font-semibold tabular-nums rtl:text-right ${color}`}>
        {value}
      </p>
      {note && <p className="mt-1 text-[13px] leading-snug text-muted">{note}</p>}
    </div>
  );
}
