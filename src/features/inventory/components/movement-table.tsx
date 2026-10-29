import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { formatDay, formatTime } from "@/lib/dates";
import { movementTypeLabels } from "../constants";
import type { MovementRow } from "../queries";

/** Bitácora de movimientos. `showProduct` en la vista global; oculto en el detalle de un producto. */
export function MovementTable({ rows, showProduct = true }: { rows: MovementRow[]; showProduct?: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-ink-2">No hay movimientos.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[36rem] text-left">
        <thead className="border-b border-line bg-surface-2 text-sm text-ink-2">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Fecha</th>
            {showProduct && <th className="px-4 py-2.5 font-semibold">Producto</th>}
            <th className="px-4 py-2.5 font-semibold">Movimiento</th>
            <th className="px-4 py-2.5 text-right font-semibold">Cantidad</th>
            <th className="px-4 py-2.5 text-right font-semibold">Stock</th>
            <th className="px-4 py-2.5 font-semibold">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((m) => {
            const positive = m.quantity > 0;
            return (
              <tr key={m.id}>
                <td className="px-4 py-2.5 whitespace-nowrap text-ink-2">
                  {formatDay(m.createdAt)}, {formatTime(m.createdAt)}
                </td>
                {showProduct && (
                  <td className="px-4 py-2.5">
                    <Link href={`/productos/${m.product.id}`} className="font-semibold text-ink hover:underline">
                      {m.product.name}
                    </Link>
                  </td>
                )}
                <td className="px-4 py-2.5 text-ink">{movementTypeLabels[m.type]}</td>
                <td className={`figure px-4 py-2.5 text-right text-lg font-bold ${positive ? "text-ok" : "text-ink"}`}>
                  {positive ? "+" : "−"}
                  {Math.abs(m.quantity)}
                </td>
                <td className="figure px-4 py-2.5 text-right whitespace-nowrap text-ink-2">
                  {m.stockBefore} → <span className="font-semibold text-ink">{m.stockAfter}</span>
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">
                  {m.sale ? (
                    <Link href={`/ventas/${m.sale.id}`} className="font-semibold text-ink hover:underline">
                      {m.type === "VOID" ? "Anulación de" : "Venta"} #{String(m.sale.folio).padStart(4, "0")}
                    </Link>
                  ) : (
                    <>
                      {m.reason}
                      {m.unitCost !== null && m.type === "PURCHASE" && (
                        <span className="text-ink-3"> ({formatMoney(m.unitCost)} c/u)</span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
