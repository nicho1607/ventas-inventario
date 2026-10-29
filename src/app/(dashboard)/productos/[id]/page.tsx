import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { ButtonLink, PageHeader, StockBadge } from "@/components/ui";
import { getCategories, getProduct } from "@/features/products/queries";
import { getProductMovements } from "@/features/inventory/queries";
import { ProductForm } from "@/features/products/components/product-form";
import { ArchiveButton } from "@/features/products/components/archive-button";
import { MovementTable } from "@/features/inventory/components/movement-table";

export const metadata: Metadata = { title: "Producto" };

async function ProductDetail({ params }: { params: PageProps<"/productos/[id]">["params"] }) {
  const { id } = await params;
  const [product, categories, movements] = await Promise.all([getProduct(id), getCategories(), getProductMovements(id)]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Stock actual <StockBadge stock={product.stock} minStock={product.minStock} />
            {!product.isActive && <span className="font-semibold text-warn">Archivado: no aparece en Vender</span>}
          </span>
        }
        actions={
          <>
            {product.isActive && (
              <ButtonLink href={`/inventario/entrada?producto=${product.id}`}>
                <PackagePlus className="size-5" aria-hidden />
                Registrar movimiento
              </ButtonLink>
            )}
            <ArchiveButton id={product.id} name={product.name} isActive={product.isActive} />
          </>
        }
      />
      <div className="space-y-10">
        <section aria-labelledby="edit-title" className="max-w-3xl">
          <h2 id="edit-title" className="mb-4 font-display text-xl font-bold">
            Datos del producto
          </h2>
          <ProductForm key={product.id} categories={categories} product={product} />
        </section>
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="mb-4 font-display text-xl font-bold">
            Movimientos recientes
          </h2>
          <MovementTable rows={movements} showProduct={false} />
        </section>
      </div>
    </>
  );
}

export default function ProductPage({ params }: PageProps<"/productos/[id]">) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-6 md:py-8">
      <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-xl bg-surface-2" />}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  );
}
