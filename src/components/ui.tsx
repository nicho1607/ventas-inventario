import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CircleSlash } from "lucide-react";
import { stockStatus } from "@/lib/stock";

// Piezas compartidas del panel: encabezado de página, campos de formulario, badge de stock.

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const buttonStyles = {
  primary: "bg-brand text-brand-ink",
  secondary: "border border-line bg-surface text-ink hover:border-ink-3",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "border border-line bg-surface text-danger hover:border-danger",
} as const;

type Variant = keyof typeof buttonStyles;
const base = "inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 font-bold transition-transform active:scale-[0.98] disabled:opacity-50";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${buttonStyles[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${buttonStyles[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-ink-3">{hint}</p>
      )}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-lg border border-line bg-surface px-3 text-lg text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none aria-invalid:border-danger";

export function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const status = stockStatus(stock, minStock);
  if (status === "out")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-danger-soft px-2 py-0.5 text-sm font-bold text-danger">
        <CircleSlash className="size-3.5" aria-hidden />
        Agotado
      </span>
    );
  if (status === "low")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-warn-soft px-2 py-0.5 text-sm font-bold text-warn">
        <AlertTriangle className="size-3.5" aria-hidden />
        <span className="figure">{stock}</span> de {minStock}
      </span>
    );
  return <span className="figure text-base font-semibold text-ink">{stock}</span>;
}
