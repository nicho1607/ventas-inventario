import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ButtonLink, inputClass, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { formatDay, formatTime, startOfDay } from "@/lib/dates";
import { getSales, periods, type Period, type SalesFilter } from "@/features/sales/queries";
import { paymentMethodLabels, paymentMethods } from "@/features/sales/schemas";
import { folioLabel } from "@/features/sales/components/sale-receipt";

export const metadata: Metadata = { title: "Ventas" };

type SearchParams = Awaited<PageProps<"/ventas">["searchParams"]>;

function parseFilter(sp: SearchParams): SalesFilter {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const period = periods.some((p) => p.id === str("periodo")) ? (str("periodo") as Period) : "hoy";
  const method = paymentMethods.find((m) => m === str("metodo"));
  const folio = Number(str("folio")?.replace(/\D/g, "")) || undefined;
  return { period, method, voided: str("estado") === "anuladas", folio, page: Math.max(1, Math.floor(Number(str("pagina"))) || 1) };
}

function href(f: SalesFilter, patch: Partial<SalesFilter>) {
  const n = { ...f, page: 1, folio: undefined, ...patch };
  const q = new URLSearchParams();
  if (n.period !== "hoy") q.set("periodo", n.period);
  if (n.method) q.set("metodo", n.method);
  if (n.voided) q.set("estado", "anuladas");
  if (n.page > 1) q.set("pagina", String(n.page));
  const s = q.toString();
  return s ? `/ventas?${s}` : "/ventas";
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className="flex h-10 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-2 aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-bg"
    >
      {children}
    </Link>
  );
}

async function Sales({ searchParams }: { searchParams: PageProps<"/ventas">["searchParams"] }) {
  const f = parseFilter(await searchParams);
  const { rows, total, pages, summary } = await getSales(f);
  const today = startOfDay();
  const when = (d: Date) => (d >= today ? formatTime(d) : `${formatDay(d)}, ${formatTime(d)}`);
  const periodLabel = periods.find((p) => p.id === f.period)!.label.toLowerCase();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Periodo" className="-mx-4 flex gap-2 scroll-row overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {periods.map((p) => (
            <Chip key={p.id} href={href(f, { period: p.id })} active={!f.folio && f.period === p.id}>
              {p.label}
            </Chip>
          ))}
        </nav>
        <form action="/ventas" className="relative lg:w-64" role="search">
          <label htmlFor="folio" className="sr-only">
            Buscar por número de venta
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            id="folio"
            name="folio"
            inputMode="numeric"
            defaultValue={f.folio ?? ""}
            placeholder="Número de venta, ej. 1587"
            className={`${inputClass} h-10 pl-10 text-base`}
          />
        </form>
      </div>

      {f.folio ? (
        <p className="text-ink-2">
          Resultado para la venta {folioLabel(f.folio)}.{" "}
          <Link href={href(f, {})} className="font-semibold text-brand underline underline-offset-4">
            Ver todas
          </Link>
        </p>
      ) : (
        <>
          <nav aria-label="Método de pago y estado" className="-mx-4 flex gap-2 scroll-row overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            <Chip href={href(f, { method: undefined, voided: false })} active={!f.method && !f.voided}>
              Todos los pagos
            </Chip>
            {paymentMethods.map((m) => (
              <Chip key={m} href={href(f, { method: m, voided: false })} active={f.method === m && !f.voided}>
                {paymentMethodLabels[m]}
              </Chip>
            ))}
            <Chip href={href(f, { voided: !f.voided, method: undefined })} active={f.voided}>
              Anuladas
            </Chip>
          </nav>

          {!f.voided && (
            <section
              aria-label={`Resumen de ${periodLabel}`}
              className="grid grid-cols-2 divide-line border-y border-line lg:grid-cols-4 lg:divide-x"
            >
              <Stat label="Vendido" value={formatMoney(summary.revenue)} detail={`${summary.count} ventas`} />
              <Stat label="Ganancia estimada" value={formatMoney(summary.profit)} detail={summary.revenue ? `Margen ${Math.round((summary.profit / summary.revenue) * 100)} %` : "—"} />
              <Stat
                label="Efectivo en caja"
                value={formatMoney(summary.methods.CASH?.total ?? 0)}
                detail={`${summary.methods.CASH?.count ?? 0} pagos en efectivo`}
              />
              <Stat
                label="Tarjeta y transferencia"
                value={formatMoney((summary.methods.CARD?.total ?? 0) + (summary.methods.TRANSFER?.total ?? 0))}
                detail={
                  summary.voidedCount > 0
                    ? `${summary.voidedCount} ${summary.voidedCount === 1 ? "venta anulada" : "ventas anuladas"}, no cuentan`
                    : `${(summary.methods.CARD?.count ?? 0) + (summary.methods.TRANSFER?.count ?? 0)} pagos`
                }
              />
            </section>
          )}
        </>
      )}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-ink-2">
          {f.folio ? `No existe la venta ${folioLabel(f.folio)}.` : f.voided ? "No hay ventas anuladas en este periodo." : `No hay ventas ${periodLabel === "todo" ? "registradas" : `de ${periodLabel}`}.`}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left">
            <thead className="border-b border-line bg-surface-2 text-sm text-ink-2">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Venta</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Fecha</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Productos</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Pago</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Ganancia</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => {
                const voided = s.status === "VOIDED";
                return (
                  <tr key={s.id} className={`relative hover:bg-surface-2/60 ${voided ? "text-ink-3" : "text-ink"}`}>
                    <td className="px-4 py-3">
                      {/* El enlace cubre toda la fila */}
                      <Link href={`/ventas/${s.id}`} className="figure font-bold after:absolute after:inset-0 hover:underline">
                        {folioLabel(s.folio)}
                      </Link>
                      {voided && <span className="ml-2 rounded bg-danger-soft px-1.5 py-0.5 text-xs font-bold text-danger">Anulada</span>}
                      {/* En celular la fecha va bajo el número para que el total siempre se vea */}
                      <p className="text-sm text-ink-2 sm:hidden">{when(s.createdAt)}</p>
                    </td>
                    <td className="hidden px-4 py-3 whitespace-nowrap text-ink-2 sm:table-cell">{when(s.createdAt)}</td>
                    <td className="figure hidden px-4 py-3 text-right text-ink-2 sm:table-cell">{s._count.items}</td>
                    <td className="hidden px-4 py-3 text-ink-2 md:table-cell">{paymentMethodLabels[s.paymentMethod]}</td>
                    <td className="figure hidden px-4 py-3 text-right text-ink-2 lg:table-cell">{voided ? "—" : formatMoney(s.total - s.totalCost)}</td>
                    <td className={`figure px-4 py-3 text-right text-lg font-bold ${voided ? "line-through" : ""}`}>{formatMoney(s.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-2">
          <p>
            {total.toLocaleString("es-CO")} ventas, página {f.page} de {pages}
          </p>
          <div className="flex gap-2">
            {f.page > 1 && (
              <ButtonLink variant="secondary" href={href(f, { page: f.page - 1, folio: f.folio })} className="h-10">
                Más recientes
              </ButtonLink>
            )}
            {f.page < pages && (
              <ButtonLink variant="secondary" href={href(f, { page: f.page + 1, folio: f.folio })} className="h-10">
                Más antiguas
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-line py-4 odd:pr-4 even:border-l even:pl-4 [&:nth-child(n+3)]:border-t lg:px-5 lg:first:pl-0 lg:[&:nth-child(n+3)]:border-t-0">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="figure mt-0.5 text-2xl font-bold text-ink md:text-3xl">{value}</p>
      <p className="text-sm text-ink-3">{detail}</p>
    </div>
  );
}

export default function SalesPage({ searchParams }: PageProps<"/ventas">) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <PageHeader title="Ventas" description="Cada venta registrada, con su pago y su ganancia. Desde el detalle puedes reimprimir la tirilla o anularla." />
      <Suspense fallback={<div aria-hidden className="h-[36rem] animate-pulse rounded-xl bg-surface-2" />}>
        <Sales searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
