import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { formatLongDay, formatTime } from "@/lib/dates";
import { getSale } from "@/features/sales/queries";
import { getStoreSettings } from "@/features/settings/queries";
import { paymentMethodLabels } from "@/features/sales/schemas";
import { folioLabel, SaleReceipt } from "@/features/sales/components/sale-receipt";
import { PrintButton } from "@/features/sales/components/print-button";
import { VoidSaleButton } from "@/features/sales/components/void-sale-button";

export const metadata: Metadata = { title: "Venta" };

async function SaleDetail({ params, searchParams }: PageProps<"/ventas/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [sale, store] = await Promise.all([getSale(id), getStoreSettings()]);
  if (!sale) notFound();

  const voided = sale.status === "VOIDED";
  const profit = sale.total - sale.totalCost;
  const units = sale.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-6">
        <div>
          <h1 className="figure font-display text-4xl font-bold tracking-tight">Venta {folioLabel(sale.folio)}</h1>
          <p className="mt-1 text-ink-2">
            <span className="first-letter:uppercase">{formatLongDay(sale.createdAt)}</span>, {formatTime(sale.createdAt)}
          </p>
        </div>

        {voided && (
          <div role="status" className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-danger">
            <p className="font-bold">Venta anulada</p>
            <p>Motivo: {sale.voidReason ?? "sin motivo"}. El stock se devolvió al inventario.</p>
            {sale.voidedAt && (
              <p className="text-sm">
                Anulada el {formatLongDay(sale.voidedAt)}, {formatTime(sale.voidedAt)}
              </p>
            )}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-4 sm:grid-cols-4">
          <Info label="Total" value={formatMoney(sale.total)} strong />
          <Info label="Ganancia estimada" value={voided ? "—" : formatMoney(profit)} />
          <Info label="Pago" value={paymentMethodLabels[sale.paymentMethod]} />
          <Info label="Productos" value={`${units} ${units === 1 ? "unidad" : "unidades"}`} />
        </dl>

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left">
            <thead className="border-b border-line bg-surface-2 text-sm text-ink-2">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Producto</th>
                <th className="px-4 py-2.5 text-right font-semibold">Cant.</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Precio</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold md:table-cell">Costo</th>
                <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sale.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3">
                    <Link href={`/productos/${i.productId}`} className="font-semibold hover:underline">
                      {i.productName}
                    </Link>
                  </td>
                  <td className="figure px-4 py-3 text-right">{i.quantity}</td>
                  <td className="figure hidden px-4 py-3 text-right text-ink-2 sm:table-cell">{formatMoney(i.unitPrice)}</td>
                  <td className="figure hidden px-4 py-3 text-right text-ink-3 md:table-cell">{formatMoney(i.unitCost)}</td>
                  <td className="figure px-4 py-3 text-right font-bold">{formatMoney(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-ink-3">Los precios y costos son los que tenía cada producto al momento de la venta.</p>

        <div className="flex flex-wrap gap-2">
          <PrintButton auto={sp.imprimir === "1"} />
          {!voided && <VoidSaleButton saleId={sale.id} folioLabel={folioLabel(sale.folio)} />}
        </div>
      </div>

      <aside aria-label="Tirilla" className="lg:pt-2">
        <SaleReceipt sale={sale} store={store} />
      </aside>
    </div>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className={`figure ${strong ? "text-2xl font-extrabold" : "text-xl font-bold"}`}>{value}</dd>
    </div>
  );
}

export default function SalePage(props: PageProps<"/ventas/[id]">) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <Link href="/ventas" className="inline-flex items-center gap-1 font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Ventas
      </Link>
      <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-xl bg-surface-2" />}>
        <SaleDetail {...props} />
      </Suspense>
    </div>
  );
}
