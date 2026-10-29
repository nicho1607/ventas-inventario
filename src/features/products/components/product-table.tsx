"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { PackagePlus, Search } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { stockStatus } from "@/lib/stock";
import { inputClass, StockBadge } from "@/components/ui";
import type { AdminProduct, PosCategory } from "../queries";

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const statusFilters = [
  { id: "active", label: "Activos" },
  { id: "restock", label: "Por reponer" },
  { id: "archived", label: "Archivados" },
] as const;
type StatusFilter = (typeof statusFilters)[number]["id"];

export function ProductTable({ products, categories }: { products: AdminProduct[]; categories: PosCategory[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const counts = useMemo(
    () => ({
      active: products.filter((p) => p.isActive).length,
      restock: products.filter((p) => p.isActive && stockStatus(p.stock, p.minStock) !== "ok").length,
      archived: products.filter((p) => !p.isActive).length,
    }),
    [products],
  );

  const visible = useMemo(() => {
    const q = normalize(deferred.trim());
    return products
      .filter((p) =>
        status === "archived"
          ? !p.isActive
          : p.isActive && (status === "active" || stockStatus(p.stock, p.minStock) !== "ok"),
      )
      .filter((p) => !categoryId || p.category?.id === categoryId)
      .filter((p) => !q || normalize(p.name).includes(q) || p.sku?.includes(q))
      .sort((a, b) => (status === "restock" ? a.stock - b.stock || a.name.localeCompare(b.name) : 0));
  }, [products, deferred, categoryId, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Buscar por nombre o código</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o código"
            className={`${inputClass} pl-10`}
          />
        </label>
        <label className="sr-only" htmlFor="category-filter">
          Categoría
        </label>
        <select
          id="category-filter"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={`${inputClass} lg:w-52`}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div role="group" aria-label="Estado" className="flex rounded-lg bg-surface-2 p-1">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={status === f.id}
              onClick={() => setStatus(f.id)}
              className="h-10 flex-1 rounded-md px-3 text-sm font-semibold whitespace-nowrap text-ink-2 aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
            >
              {f.label} <span className="figure text-ink-3">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-ink-2">
          {status === "restock"
            ? "Ningún producto está en el mínimo."
            : status === "archived"
              ? "No hay productos archivados."
              : "Ningún producto coincide con la búsqueda."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left">
            <thead className="border-b border-line bg-surface-2 text-sm text-ink-2">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Producto</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Categoría</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Compra</th>
                <th className="px-4 py-2.5 text-right font-semibold">Venta</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Margen</th>
                <th className="px-4 py-2.5 text-right font-semibold">Stock</th>
                <th className="hidden px-2 py-2.5 sm:table-cell">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((p) => {
                const margin = p.salePrice ? Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100) : 0;
                return (
                  <tr key={p.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link href={`/productos/${p.id}`} className="font-semibold text-ink hover:underline">
                        {p.name}
                      </Link>
                      {p.sku && <p className="figure text-sm text-ink-3">{p.sku}</p>}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {p.category ? (
                        <span className="inline-flex items-center gap-2 text-ink-2">
                          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: p.category.color ?? undefined }} />
                          {p.category.name}
                        </span>
                      ) : (
                        <span className="text-ink-3">Sin categoría</span>
                      )}
                    </td>
                    <td className="figure hidden px-4 py-3 text-right text-ink-2 sm:table-cell">{formatMoney(p.costPrice)}</td>
                    <td className="figure px-4 py-3 text-right font-semibold text-ink">{formatMoney(p.salePrice)}</td>
                    <td className={`figure hidden px-4 py-3 text-right lg:table-cell ${margin < 0 ? "font-semibold text-danger" : "text-ink-2"}`}>
                      {margin} %
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StockBadge stock={p.stock} minStock={p.minStock} />
                    </td>
                    <td className="hidden px-2 py-3 text-right sm:table-cell">
                      {p.isActive && (
                        <Link
                          href={`/inventario/entrada?producto=${p.id}`}
                          aria-label={`Registrar entrada de ${p.name}`}
                          title="Registrar entrada"
                          className="inline-grid size-10 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-brand"
                        >
                          <PackagePlus className="size-5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
