import { connection } from "next/server";
import Link from "next/link";
import { AlertTriangle, CircleSlash, PackagePlus } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { formatTime, formatDay, startOfDay } from "@/lib/dates";
import { paymentMethodLabels } from "@/features/sales/schemas";
import { getCriticalStock, getRecentSales, getSalesTrend, getTopProducts } from "../queries";
import { SalesTrendChart } from "./sales-trend-chart";

export async function SalesTrend() {
  await connection(); // datos por request (cacheComponents)
  const [daily, monthly] = await Promise.all([getSalesTrend("day"), getSalesTrend("month")]);
  return <SalesTrendChart daily={daily} monthly={monthly} />;
}

export async function CriticalStock() {
  await connection(); // datos por request (cacheComponents)
  const products = await getCriticalStock();
  return (
    <section aria-labelledby="restock-title" className="rounded-xl border border-line bg-surface p-4 md:p-5">
      <h2 id="restock-title" className="font-display text-lg font-bold">
        Por reponer
      </h2>
      {products.length === 0 ? (
        <p className="mt-3 text-ink-2">Ningún producto está en el mínimo. Buen trabajo.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {products.map((p) => {
            const out = p.stock <= 0;
            const Icon = out ? CircleSlash : AlertTriangle;
            return (
              <li key={p.id} className="flex items-center gap-3 py-1.5">
                <Icon className={`size-5 shrink-0 ${out ? "text-danger" : "text-warn"}`} aria-hidden />
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{p.name}</span>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-sm font-bold ${out ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}
                >
                  {out ? "Agotado" : `${p.stock} de ${p.minStock}`}
                </span>
                <Link
                  href={`/inventario/entrada?producto=${p.id}`}
                  aria-label={`Registrar entrada de ${p.name}`}
                  title="Registrar entrada"
                  className="grid size-10 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-brand"
                >
                  <PackagePlus className="size-5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export async function TopProducts() {
  await connection(); // datos por request (cacheComponents)
  const top = await getTopProducts();
  const max = Math.max(1, ...top.map((t) => t.units));
  return (
    <section aria-labelledby="top-title">
      <h2 id="top-title" className="font-display text-lg font-bold">
        Lo más vendido este mes
      </h2>
      {top.length === 0 ? (
        <p className="mt-3 text-ink-2">Aún no hay ventas este mes.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {top.map((t, i) => (
            <li key={t.productId}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-semibold text-ink">
                  <span className="figure mr-2 text-ink-3">{i + 1}</span>
                  {t.name}
                </span>
                <span className="figure shrink-0 text-ink">
                  <span className="font-bold">{t.units.toLocaleString("es-CO")}</span>
                  <span className="text-ink-3"> und · </span>
                  {formatMoney(t.revenue)}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-surface-2" aria-hidden>
                <div className="h-2 rounded-full bg-brand" style={{ width: `${(t.units / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export async function RecentSales() {
  await connection(); // datos por request (cacheComponents)
  const sales = await getRecentSales();
  const today = startOfDay();
  return (
    <section aria-labelledby="recent-title">
      <div className="flex items-baseline justify-between">
        <h2 id="recent-title" className="font-display text-lg font-bold">
          Últimas ventas
        </h2>
        <Link href="/ventas" className="text-sm font-semibold text-brand hover:underline">
          Ver todas
        </Link>
      </div>
      {sales.length === 0 ? (
        <p className="mt-3 text-ink-2">Las ventas que registres aparecerán aquí.</p>
      ) : (
        <table className="mt-2 w-full text-left">
          <thead className="sr-only">
            <tr>
              <th>Folio</th>
              <th>Hora</th>
              <th>Método</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sales.map((s) => {
              const voided = s.status === "VOIDED";
              return (
                <tr key={s.id} className={`relative hover:bg-surface-2/60 ${voided ? "text-ink-3" : "text-ink"}`}>
                  <td className="figure py-2.5 pr-3 font-semibold">
                    <Link href={`/ventas/${s.id}`} className="after:absolute after:inset-0 hover:underline">
                      #{String(s.folio).padStart(4, "0")}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-ink-2">
                    {s.createdAt >= today ? formatTime(s.createdAt) : `${formatDay(s.createdAt)}, ${formatTime(s.createdAt)}`}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-2">
                    {voided ? <span className="font-semibold text-danger">Anulada</span> : paymentMethodLabels[s.paymentMethod]}
                  </td>
                  <td className={`figure py-2.5 text-right font-bold ${voided ? "line-through" : ""}`}>{formatMoney(s.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
