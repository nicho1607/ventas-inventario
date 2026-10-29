import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/** Variación porcentual con ícono + texto (nunca solo color) */
export function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous <= 0) return <span className="text-sm text-ink-3">Sin datos para comparar {label}</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${up ? "text-ok" : "text-danger"}`}>
      <Icon className="size-4" aria-hidden />
      {up ? "+" : "−"}
      {Math.abs(pct)} % <span className="font-normal text-ink-3">{label}</span>
    </span>
  );
}
