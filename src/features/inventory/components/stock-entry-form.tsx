"use client";

import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import { CircleCheck, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, inputClass, StockBadge } from "@/components/ui";
import { MoneyInput } from "@/components/money-input";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import type { ProductOption } from "@/features/products/queries";
import { registerMovementAction, type MovementResult } from "../actions";

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const modes = [
  { id: "PURCHASE", label: "Compra", hint: "Llegó mercancía del proveedor" },
  { id: "ADJUSTMENT_OUT", label: "Salida", hint: "Merma, daño, vencido o consumo" },
  { id: "ADJUSTMENT_IN", label: "Ajuste +", hint: "El conteo físico dio más unidades" },
  { id: "RETURN", label: "Devolución", hint: "Un cliente devolvió el producto" },
] as const;
type Mode = (typeof modes)[number]["id"];

const reasonPresets = ["Merma", "Producto dañado", "Vencido", "Consumo interno", "Conteo físico"];

type Done = Extract<MovementResult, { ok: true }>;

export function StockEntryForm({ products, initialProductId }: { products: ProductOption[]; initialProductId?: string }) {
  const [productId, setProductId] = useState(products.some((p) => p.id === initialProductId) ? initialProductId! : "");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [mode, setMode] = useState<Mode>("PURCHASE");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState<number | null>(null);
  const [updateCost, setUpdateCost] = useState(true);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [last, setLast] = useState<Done | null>(null);
  const [pending, startTransition] = useTransition();
  const qtyRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const product = products.find((p) => p.id === productId);
  const quantity = Number(qty) || 0;
  const signed = mode === "ADJUSTMENT_OUT" ? -quantity : quantity;
  const after = product ? product.stock + signed : 0;
  const cost = unitCost ?? (product ? fromCents(product.costPrice) : null);
  const costChanged = product && cost !== null && toCents(cost) !== product.costPrice;

  const matches = useMemo(() => {
    const q = normalize(deferred.trim());
    if (!q) return products.slice(0, 8);
    return products.filter((p) => normalize(p.name).includes(q) || p.sku?.includes(q)).slice(0, 8);
  }, [products, deferred]);

  function pick(p: ProductOption) {
    setProductId(p.id);
    setQuery("");
    setUnitCost(null);
    setErrors({});
    setTimeout(() => qtyRef.current?.focus(), 0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) {
      setErrors({ productId: "Elige un producto" });
      return;
    }
    startTransition(async () => {
      const result = await registerMovementAction({
        productId: product.id,
        type: mode.startsWith("ADJUSTMENT") ? "ADJUSTMENT" : (mode as "PURCHASE" | "RETURN"),
        quantity: signed,
        unitCost: mode === "PURCHASE" && cost !== null ? toCents(cost) : undefined,
        updateCostPrice: mode === "PURCHASE" && updateCost && !!costChanged,
        reason: reason || undefined,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      // Listo para el siguiente producto del mismo pedido
      setLast(result);
      setErrors({});
      setProductId("");
      setQty("");
      setUnitCost(null);
      setReason("");
      toast.success(`${result.productName}: ${result.stockBefore} → ${result.stockAfter}`);
      setTimeout(() => searchRef.current?.focus(), 0);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {last && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-soft px-4 py-3 text-ink">
          <CircleCheck className="size-5 shrink-0 text-ok" aria-hidden />
          <span>
            <strong>{last.productName}</strong> quedó en <span className="figure font-bold">{last.stockAfter}</span> unidades (
            {last.quantity > 0 ? "+" : "−"}
            {Math.abs(last.quantity)}). Puedes registrar el siguiente.
          </span>
        </p>
      )}

      {/* 1. Producto */}
      <Field label="Producto" htmlFor="product-search" error={errors.productId}>
        {product ? (
          <div className="flex items-center gap-3 rounded-lg border-2 border-brand bg-surface px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-ink">{product.name}</p>
              <p className="text-sm text-ink-2">
                Stock actual: <StockBadge stock={product.stock} minStock={product.minStock} />
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProductId("");
                setTimeout(() => searchRef.current?.focus(), 0);
              }}
              className="inline-flex h-10 items-center gap-1 rounded-md px-3 font-semibold text-ink-2 hover:bg-surface-2"
            >
              <X className="size-4" aria-hidden />
              Cambiar
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-surface">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                ref={searchRef}
                id="product-search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const exact = products.find((p) => p.sku === query.trim());
                  if (exact) pick(exact);
                  else if (matches.length === 1) pick(matches[0]);
                }}
                placeholder="Busca por nombre o escanea el código"
                autoComplete="off"
                className="h-12 w-full rounded-t-lg bg-transparent pr-3 pl-10 text-lg text-ink placeholder:text-ink-3 focus:outline-none"
              />
            </div>
            <ul className="max-h-72 divide-y divide-line overflow-y-auto border-t border-line">
              {matches.length === 0 && <li className="px-4 py-3 text-ink-3">Ningún producto coincide.</li>}
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pick(p)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2"
                  >
                    <span className="font-semibold text-ink">{p.name}</span>
                    <StockBadge stock={p.stock} minStock={p.minStock} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Field>

      {/* 2. Tipo de movimiento */}
      <fieldset>
        <legend className="mb-1.5 font-semibold text-ink">Tipo de movimiento</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => {
                setMode(m.id);
                setErrors({});
              }}
              className="rounded-lg border-2 border-line bg-surface px-3 py-2.5 text-left aria-checked:border-brand aria-checked:bg-brand-soft"
            >
              <span className="block font-bold text-ink">{m.label}</span>
              <span className="block text-sm leading-snug text-ink-2">{m.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* 3. Cantidad, costo, motivo */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={mode === "ADJUSTMENT_OUT" ? "Unidades que salen" : "Unidades que entran"}
          htmlFor="qty"
          error={errors.quantity}
        >
          <input
            ref={qtyRef}
            id="qty"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={!!errors.quantity || undefined}
            className={`${inputClass} figure text-2xl font-bold`}
          />
        </Field>

        <div className="flex flex-col justify-end rounded-lg bg-surface-2 px-4 py-3" aria-live="polite">
          <p className="text-sm text-ink-2">Stock después del movimiento</p>
          {product && quantity > 0 ? (
            <p className={`figure text-2xl font-bold ${after < 0 ? "text-danger" : "text-ink"}`}>
              {product.stock} → {after}
              {after < 0 && <span className="ml-2 text-base font-semibold">No alcanza</span>}
            </p>
          ) : (
            <p className="text-ink-3">Elige un producto y la cantidad</p>
          )}
        </div>

        {mode === "PURCHASE" && (
          <Field
            label="Costo por unidad"
            htmlFor="unitCost"
            error={errors.unitCost}
            hint={product && quantity > 0 && cost !== null ? `Total de la compra: ${formatMoney(toCents(cost) * quantity)}` : undefined}
          >
            <MoneyInput id="unitCost" value={cost} onChange={setUnitCost} />
            {costChanged && (
              <label className="mt-1 flex items-center gap-2 text-ink-2">
                <input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} className="size-5 accent-[var(--brand)]" />
                Actualizar el precio de compra del producto ({formatMoney(product.costPrice)} → {formatMoney(toCents(cost!))})
              </label>
            )}
          </Field>
        )}

        <div className={mode === "PURCHASE" ? "" : "sm:col-span-2"}>
          <Field
            label={mode === "ADJUSTMENT_OUT" ? "Motivo" : "Nota (opcional)"}
            htmlFor="reason"
            error={errors.reason}
          >
            <input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === "PURCHASE" ? "Proveedor o número de factura" : ""}
              aria-invalid={!!errors.reason || undefined}
              className={inputClass}
            />
            {mode.startsWith("ADJUSTMENT") && (
              <div className="mt-1 flex flex-wrap gap-2">
                {reasonPresets.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={reason === r}
                    onClick={() => setReason(r)}
                    className="h-9 rounded-full border border-line px-3 text-sm font-semibold text-ink-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </Field>
        </div>
      </div>

      <Button type="submit" disabled={pending || !product || quantity <= 0 || after < 0} className="h-14 w-full text-lg sm:w-auto sm:min-w-64">
        {pending ? "Registrando…" : "Registrar movimiento"}
      </Button>
    </form>
  );
}
