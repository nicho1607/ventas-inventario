"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, inputClass } from "@/components/ui";
import { MoneyInput } from "@/components/money-input";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import type { PosCategory } from "../queries";
import { createProductAction, updateProductAction } from "../actions";

type Initial = {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  costPrice: number;
  salePrice: number;
  minStock: number;
};

type Props = { categories: PosCategory[]; product?: Initial };

export function ProductForm({ categories, product }: Props) {
  const router = useRouter();
  const isEdit = !!product;
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [cost, setCost] = useState<number | null>(product ? fromCents(product.costPrice) : null);
  const [price, setPrice] = useState<number | null>(product ? fromCents(product.salePrice) : null);
  const [minStock, setMinStock] = useState(String(product?.minStock ?? 5));
  const [initialStock, setInitialStock] = useState("0");

  const profit = price !== null && cost !== null ? price - cost : null;
  const margin = profit !== null && price ? Math.round((profit / price) * 100) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name,
      sku,
      categoryId: categoryId || null,
      costPrice: toCents(cost ?? NaN),
      salePrice: toCents(price ?? NaN),
      minStock: Number(minStock),
    };
    startTransition(async () => {
      const result = isEdit
        ? await updateProductAction(product.id, data)
        : await createProductAction({ ...data, initialStock: Number(initialStock) });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      if (isEdit) {
        toast.success("Cambios guardados");
        router.refresh();
      } else {
        toast.success(`${name} creado`);
        router.push(`/productos/${result.id}`);
      }
    });
  }

  const err = (k: string) => ({
    "aria-invalid": !!errors[k] || undefined,
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nombre" htmlFor="name" error={errors.name}>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!isEdit} className={inputClass} {...err("name")} />
          </Field>
        </div>
        <Field label="Código de barras o interno" htmlFor="sku" error={errors.sku} hint="Opcional. Escanéalo aquí con el lector.">
          <input
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            // El lector envía Enter al terminar: que no envíe el formulario
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            className={`${inputClass} figure`}
            {...err("sku")}
          />
        </Field>
        <Field label="Categoría" htmlFor="category" error={errors.categoryId}>
          <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="grid gap-5 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3 sm:p-5">
        <legend className="px-1 font-display font-bold">Precios</legend>
        <Field label="Precio de compra" htmlFor="cost" error={errors.costPrice}>
          <MoneyInput id="cost" value={cost} onChange={setCost} {...err("costPrice")} />
        </Field>
        <Field label="Precio de venta" htmlFor="price" error={errors.salePrice}>
          <MoneyInput id="price" value={price} onChange={setPrice} {...err("salePrice")} />
        </Field>
        <div className="flex flex-col justify-end rounded-lg bg-surface-2 px-4 py-3" aria-live="polite">
          <p className="text-sm text-ink-2">Ganancia por unidad</p>
          {profit === null ? (
            <p className="text-ink-3">Escribe ambos precios</p>
          ) : (
            <p className={`figure text-2xl font-bold ${profit < 0 ? "text-danger" : "text-ink"}`}>
              {profit < 0 ? "− " : ""}
              {formatMoney(toCents(Math.abs(profit)))}{" "}
              <span className="text-base font-semibold text-ink-2">({margin} %)</span>
            </p>
          )}
        </div>
        {profit !== null && profit < 0 && (
          <p className="flex items-center gap-2 rounded-md bg-warn-soft px-3 py-2 text-sm font-semibold text-warn sm:col-span-3">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Con este precio vendes a pérdida. Puedes guardarlo si es una liquidación.
          </p>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Stock mínimo" htmlFor="minStock" error={errors.minStock} hint="Cuando el stock llegue a este número, aparece en Por reponer.">
          <input
            id="minStock"
            inputMode="numeric"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} figure`}
            {...err("minStock")}
          />
        </Field>
        {!isEdit && (
          <Field label="Stock inicial" htmlFor="initialStock" error={errors.initialStock} hint="Las unidades que tienes hoy en la tienda.">
            <input
              id="initialStock"
              inputMode="numeric"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value.replace(/\D/g, ""))}
              className={`${inputClass} figure`}
              {...err("initialStock")}
            />
          </Field>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="min-w-44">
          {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear producto"}
        </Button>
        <Button variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
