"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import type { PosCategory, PosProduct } from "@/features/products/queries";
import { useCart } from "../store/cart";
import { createSaleAction } from "../actions";
import { ProductTile } from "./product-tile";
import { CartReceipt, type ResolvedLine } from "./cart-receipt";
import { PaymentDialog } from "./payment-dialog";

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

type Props = { products: PosProduct[]; categories: PosCategory[]; storeName: string };

export function PosScreen({ products, categories, storeName }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // hoja del carrito en pantallas angostas
  const [errorProductId, setErrorProductId] = useState<string | null>(null);

  const { lines, discount, requestId, add, setQty, remove, setDiscount, clear } = useCart();

  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categoryColor = useMemo(() => new Map(categories.map((c) => [c.id, c.color])), [categories]);

  // Líneas con datos frescos del catálogo; descarta productos que ya no existen
  const resolved: ResolvedLine[] = useMemo(
    () =>
      lines.flatMap((l) => {
        const product = byId.get(l.productId);
        return product ? [{ product, quantity: l.quantity, lineTotal: product.salePrice * l.quantity }] : [];
      }),
    [lines, byId],
  );
  const qtyInCart = useMemo(() => new Map(lines.map((l) => [l.productId, l.quantity])), [lines]);
  const subtotal = resolved.reduce((s, l) => s + l.lineTotal, 0);
  const appliedDiscount = Math.min(discount, subtotal);
  const total = subtotal - appliedDiscount;
  const itemCount = resolved.reduce((s, l) => s + l.quantity, 0);

  const visible = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return products.filter(
      (p) =>
        (!categoryId || p.categoryId === categoryId) &&
        (!q || normalize(p.name).includes(q) || p.sku?.includes(q)),
    );
  }, [products, deferredQuery, categoryId]);

  const addProduct = useCallback(
    (p: PosProduct) => {
      setErrorProductId(null);
      if (!add(p.id, p.stock)) toast.warning(`No hay más ${p.name} en stock`);
    },
    [add],
  );

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);

  const openPayment = useCallback(() => {
    if (resolved.length > 0) setPaying(true);
  }, [resolved.length]);

  // Atajos globales
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (paying) return;
      const typing = e.target instanceof HTMLInputElement;
      if (e.key === "F2" || (e.key === "/" && !typing)) {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "F8") {
        e.preventDefault();
        openPayment();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paying, focusSearch, openPayment]);

  // Enter en el buscador: código exacto (lector de barras) o único resultado
  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      return;
    }
    if (e.key !== "Enter") return;
    const q = query.trim();
    if (!q) return openPayment();
    const exact = products.find((p) => p.sku === q);
    const target = exact ?? (visible.length === 1 ? visible[0] : null);
    if (target) {
      addProduct(target);
      setQuery("");
    } else if (/^\d{6,}$/.test(q)) {
      toast.error(`No hay ningún producto con el código ${q}`);
      setQuery("");
    }
  }

  async function confirmSale(method: "CASH" | "TRANSFER" | "CARD", amountPaid: number | undefined) {
    const result = await createSaleAction({
      clientRequestId: requestId,
      items: lines.map(({ productId, quantity }) => ({ productId, quantity })),
      discount: appliedDiscount,
      paymentMethod: method,
      amountPaid,
    });
    if (!result.ok && result.code === "INSUFFICIENT_STOCK") {
      setErrorProductId(result.productId ?? null);
      setPaying(false);
      setCartOpen(true);
      toast.error(result.message);
    }
    return result;
  }

  function finishSale() {
    clear();
    setPaying(false);
    setCartOpen(false);
    setErrorProductId(null);
    toast.success("Venta registrada");
    setTimeout(focusSearch, 0);
  }

  const receipt = (
    <CartReceipt
      storeName={storeName}
      lines={resolved}
      subtotal={subtotal}
      discount={appliedDiscount}
      total={total}
      errorProductId={errorProductId}
      onQty={(id, q) => {
        setErrorProductId(null);
        setQty(id, q, byId.get(id)?.stock ?? 0);
      }}
      onRemove={remove}
      onDiscount={setDiscount}
      onClear={() => {
        clear();
        focusSearch();
      }}
      onCheckout={openPayment}
      onClose={cartOpen ? () => setCartOpen(false) : undefined}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-3.5rem)]">
      {/* Catálogo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="space-y-3 border-b border-line px-4 pt-4 pb-3 md:px-6">
          <label className="relative block">
            <span className="sr-only">Buscar producto o escanear código</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Buscar o escanear código"
              autoComplete="off"
              className="h-14 w-full rounded-lg border border-line bg-surface pr-16 pl-12 text-lg text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
            />
            <kbd className="absolute top-1/2 right-4 hidden -translate-y-1/2 rounded border border-line px-1.5 text-xs text-ink-3 lg:block">
              F2
            </kbd>
          </label>

          <div className="-mx-4 flex gap-2 scroll-row overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6" role="group" aria-label="Categorías">
            <CategoryChip active={categoryId === null} onClick={() => setCategoryId(null)}>
              Todo
            </CategoryChip>
            {categories.map((c) => (
              <CategoryChip key={c.id} active={categoryId === c.id} color={c.color} onClick={() => setCategoryId(c.id)}>
                {c.name}
              </CategoryChip>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6 md:px-6">
          {visible.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-ink-3">
              <p>
                Ningún producto coincide con “{deferredQuery}”.
                <br />
                <button type="button" onClick={() => setQuery("")} className="mt-2 font-semibold text-brand underline underline-offset-4">
                  Limpiar búsqueda
                </button>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
              {visible.map((p) => (
                <ProductTile
                  key={p.id}
                  product={p}
                  inCart={qtyInCart.get(p.id) ?? 0}
                  categoryColor={p.categoryId ? (categoryColor.get(p.categoryId) ?? null) : null}
                  onAdd={addProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* Barra de cobro (pantallas angostas) */}
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex h-16 shrink-0 items-center gap-3 border-t border-line bg-surface px-4 text-left lg:hidden"
        >
          <ShoppingBasket className="size-6 text-ink-2" aria-hidden />
          <span className="text-ink-2">
            {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
          </span>
          <span className="figure ml-auto text-2xl font-extrabold">{formatMoney(total)}</span>
          <span className="rounded-lg bg-brand px-4 py-2 font-bold text-brand-ink">Ver venta</span>
        </button>
      </div>

      {/* Tirilla: columna fija en pantallas anchas, hoja a pantalla completa en angostas */}
      <aside className="hidden w-[24rem] shrink-0 border-l border-line bg-surface-2 p-4 lg:block xl:w-[26rem]">
        {!cartOpen && receipt}
      </aside>
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-surface-2 p-3 lg:hidden" role="dialog" aria-modal="true" aria-label="Venta actual">
          {receipt}
        </div>
      )}

      <PaymentDialog
        open={paying}
        total={total}
        onClose={() => setPaying(false)}
        onConfirm={confirmSale}
        onDone={finishSale}
      />
    </div>
  );
}

function CategoryChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 font-semibold text-ink-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
    >
      {color && <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}
