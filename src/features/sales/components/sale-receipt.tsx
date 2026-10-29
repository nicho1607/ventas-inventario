import { formatMoney } from "@/lib/money";
import { formatLongDay, formatTime } from "@/lib/dates";
import type { StoreSettings } from "@/features/settings/queries";
import { paymentMethodLabels } from "../schemas";
import type { getSale } from "../queries";

type Sale = NonNullable<Awaited<ReturnType<typeof getSale>>>;

export const folioLabel = (folio: number) => `#${String(folio).padStart(4, "0")}`;

/** Tirilla de la venta: se ve en pantalla y es lo único que sale al imprimir (ver .print-area en globals.css) */
export function SaleReceipt({ sale, store }: { sale: Sale; store: StoreSettings }) {
  const voided = sale.status === "VOIDED";
  return (
    <article className="print-area receipt-edge relative mx-auto w-full max-w-sm bg-receipt px-5 pt-5 pb-8 text-ink shadow-[0_1px_0_var(--line),0_8px_24px_-12px_rgb(0_0_0/0.25)]">
      <header className="border-b border-dashed border-line pb-3 text-center">
        <p className="font-display text-lg font-bold">{store.name}</p>
        {store.legalId && <p className="text-sm text-ink-2">NIT {store.legalId}</p>}
        {store.address && <p className="text-sm text-ink-2">{store.address}</p>}
        {store.phone && <p className="text-sm text-ink-2">Tel. {store.phone}</p>}
        <p className="mt-2 text-sm text-ink-2">
          Venta {folioLabel(sale.folio)}
          <br />
          <span className="first-letter:uppercase">{formatLongDay(sale.createdAt)}</span>, {formatTime(sale.createdAt)}
        </p>
      </header>

      <ul className="divide-y divide-dashed divide-line py-1">
        {sale.items.map((i) => (
          <li key={i.id} className="py-2">
            <div className="flex justify-between gap-3">
              <span className="font-semibold">{i.productName}</span>
              <span className="figure shrink-0 font-bold">{formatMoney(i.lineTotal)}</span>
            </div>
            <p className="figure text-sm text-ink-2">
              {i.quantity} × {formatMoney(i.unitPrice)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="space-y-1 border-t border-dashed border-line pt-3">
        {sale.discount > 0 && (
          <>
            <Row label="Subtotal" value={formatMoney(sale.subtotal)} />
            <Row label="Descuento" value={`− ${formatMoney(sale.discount)}`} />
          </>
        )}
        <div className="flex items-baseline justify-between pt-1">
          <dt className="font-display text-lg font-bold">Total</dt>
          <dd className={`figure text-3xl font-extrabold ${voided ? "line-through" : ""}`}>{formatMoney(sale.total)}</dd>
        </div>
        <Row label="Pago" value={paymentMethodLabels[sale.paymentMethod]} />
        {sale.amountPaid !== null && <Row label="Recibido" value={formatMoney(sale.amountPaid)} />}
        {sale.change !== null && <Row label="Cambio" value={formatMoney(sale.change)} />}
      </dl>

      <p className="mt-4 text-center text-sm text-ink-2">{voided ? "VENTA ANULADA" : store.receiptFooter}</p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-2">
      <dt>{label}</dt>
      <dd className="figure">{value}</dd>
    </div>
  );
}
