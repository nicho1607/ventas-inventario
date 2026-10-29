"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { formatMoney, toCents, fromCents } from "@/lib/money";
import type { PosProduct } from "@/features/products/queries";

export type ResolvedLine = { product: PosProduct; quantity: number; lineTotal: number };

type Props = {
  storeName: string;
  lines: ResolvedLine[];
  subtotal: number;
  discount: number;
  total: number;
  errorProductId: string | null;
  onQty: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onDiscount: (cents: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  onClose?: () => void; // solo en el modo hoja (móvil)
};

export function CartReceipt({
  storeName,
  lines,
  subtotal,
  discount,
  total,
  errorProductId,
  onQty,
  onRemove,
  onDiscount,
  onClear,
  onCheckout,
  onClose,
}: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(false);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  // "Vaciar" pide un segundo toque en vez de un modal
  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  return (
    <section aria-label="Venta actual" className="flex h-full flex-col">
      <div className="receipt-edge flex min-h-0 flex-1 flex-col bg-receipt pb-3 shadow-[0_1px_0_var(--line),0_8px_24px_-12px_rgb(0_0_0/0.25)]">
        <header className="flex items-start justify-between gap-2 border-b border-dashed border-line px-5 pt-4 pb-3">
          <div>
            <p className="font-display text-base font-bold text-ink">{storeName}</p>
            <p className="text-sm text-ink-3">
              {itemCount === 0 ? "Sin productos" : `${itemCount} ${itemCount === 1 ? "artículo" : "artículos"}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => (confirmClear ? (onClear(), setConfirmClear(false)) : setConfirmClear(true))}
                className={`rounded-md px-2.5 py-1.5 text-sm font-semibold ${confirmClear ? "bg-danger text-white" : "text-ink-3 hover:bg-surface-2 hover:text-ink"}`}
              >
                {confirmClear ? "Toca otra vez para vaciar" : "Vaciar"}
              </button>
            )}
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Cerrar carrito" className="grid size-10 place-items-center rounded-md text-ink-2 hover:bg-surface-2">
                <X className="size-5" />
              </button>
            )}
          </div>
        </header>

        {lines.length === 0 ? (
          <div className="grid flex-1 place-items-center px-6 py-10 text-center text-ink-3">
            <p>
              Toca un producto o escanea su código
              <br />
              para empezar la venta.
            </p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-dashed divide-line overflow-y-auto px-5">
            {lines.map(({ product, quantity, lineTotal }) => {
              const hasError = errorProductId === product.id;
              return (
                <li key={product.id} className={`py-3 ${hasError ? "-mx-5 bg-danger-soft px-5" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[0.95rem] leading-snug font-semibold text-ink">{product.name}</p>
                    <p className="figure shrink-0 text-lg font-bold text-ink">{formatMoney(lineTotal)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <QtyButton label={`Quitar una unidad de ${product.name}`} onClick={() => onQty(product.id, quantity - 1)}>
                        <Minus className="size-4" />
                      </QtyButton>
                      <span className="figure w-10 text-center text-lg font-bold" aria-live="polite">
                        {quantity}
                      </span>
                      <QtyButton
                        label={`Agregar una unidad de ${product.name}`}
                        onClick={() => onQty(product.id, quantity + 1)}
                        disabled={quantity >= product.stock}
                      >
                        <Plus className="size-4" />
                      </QtyButton>
                      <span className="ml-2 text-sm text-ink-3">× {formatMoney(product.salePrice)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(product.id)}
                      aria-label={`Eliminar ${product.name}`}
                      className="grid size-10 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {hasError && (
                    <p className="mt-1 text-sm font-semibold text-danger">
                      Solo quedan {product.stock}. Ajusta la cantidad.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <dl className="space-y-1 border-t border-dashed border-line px-5 pt-3 text-ink-2">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="figure text-base">{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>
              {editingDiscount ? (
                <label htmlFor="discount" className="text-ink-2">Descuento ($)</label>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDiscount(true)}
                  disabled={lines.length === 0}
                  className="underline decoration-dotted underline-offset-4 hover:text-ink disabled:no-underline disabled:opacity-60"
                >
                  {discount > 0 ? "Descuento" : "Agregar descuento"}
                </button>
              )}
            </dt>
            <dd className="figure text-base">
              {editingDiscount ? (
                <input
                  id="discount"
                  autoFocus
                  inputMode="numeric"
                  defaultValue={discount ? fromCents(discount) : ""}
                  onBlur={(e) => {
                    onDiscount(Math.min(toCents(Number(e.target.value.replace(/\D/g, "")) || 0), subtotal));
                    setEditingDiscount(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                  }}
                  className="w-28 rounded-md border border-line bg-surface px-2 py-1 text-right"
                />
              ) : discount > 0 ? (
                `− ${formatMoney(discount)}`
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>

        <div className="mx-5 mt-3 flex items-baseline justify-between rounded-md bg-mark px-3 py-2 text-mark-ink">
          <span className="font-display text-lg font-bold">Total</span>
          <span className="figure text-4xl font-extrabold" aria-live="polite">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={lines.length === 0}
        className="mt-3 flex h-16 items-center justify-center gap-3 rounded-lg bg-brand text-xl font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        Cobrar
        <kbd className="hidden rounded border border-current/40 px-1.5 text-xs font-semibold opacity-80 lg:inline">F8</kbd>
      </button>
    </section>
  );
}

function QtyButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-10 place-items-center rounded-md border border-line bg-surface text-ink active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
