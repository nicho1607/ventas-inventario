import { memo } from "react";
import { formatMoney } from "@/lib/money";
import { stockStatus } from "@/lib/stock";
import type { PosProduct } from "@/features/products/queries";

type Props = {
  product: PosProduct;
  inCart: number;
  categoryColor: string | null;
  onAdd: (product: PosProduct) => void;
};

export const ProductTile = memo(function ProductTile({ product, inCart, categoryColor, onAdd }: Props) {
  const available = product.stock - inCart;
  const status = stockStatus(product.stock, product.minStock);
  const soldOut = product.stock <= 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={available <= 0}
      aria-label={`${product.name}, ${formatMoney(product.salePrice)}${soldOut ? ", agotado" : `, quedan ${product.stock}`}`}
      className="group relative flex min-h-28 flex-col justify-between rounded-lg border border-line bg-surface p-3 text-left transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 enabled:hover:border-ink-3"
      style={{ borderTopColor: categoryColor ?? undefined, borderTopWidth: categoryColor ? 4 : undefined }}
    >
      <span className="line-clamp-2 text-[0.95rem] leading-snug font-semibold text-ink">{product.name}</span>

      <span className="mt-2 flex items-end justify-between gap-2">
        <span className="figure text-xl font-bold text-ink">{formatMoney(product.salePrice)}</span>
        {soldOut ? (
          <span className="rounded bg-danger-soft px-1.5 py-0.5 text-xs font-bold text-danger">Agotado</span>
        ) : (
          <span
            className={`flex items-center gap-1 text-xs font-semibold ${status === "low" ? "text-warn" : "text-ink-3"}`}
          >
            <span
              aria-hidden
              className={`size-2 rounded-full ${status === "low" ? "bg-warn" : "bg-ok"}`}
            />
            {status === "low" ? `Quedan ${product.stock}` : product.stock}
          </span>
        )}
      </span>

      {inCart > 0 && (
        <span
          aria-hidden
          className="figure absolute -top-2 -right-2 grid min-w-7 place-items-center rounded-full bg-mark px-1.5 py-0.5 text-sm font-bold text-mark-ink shadow-sm"
        >
          {inCart}
        </span>
      )}
    </button>
  );
});
