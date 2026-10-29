import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Plus, Tags } from "lucide-react";
import { ButtonLink, PageHeader } from "@/components/ui";
import { getCategories, getProductsAdmin } from "@/features/products/queries";
import { ProductTable } from "@/features/products/components/product-table";

export const metadata: Metadata = { title: "Productos" };

async function Products() {
  await connection();
  const [products, categories] = await Promise.all([getProductsAdmin(), getCategories()]);
  return <ProductTable products={products} categories={categories} />;
}

export default function ProductsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Productos"
        description="Precios, stock y mínimos de cada producto. El stock cambia con las ventas y los movimientos de inventario."
        actions={
          <>
            <ButtonLink href="/categorias" variant="secondary">
              <Tags className="size-5" aria-hidden />
              Categorías
            </ButtonLink>
            <ButtonLink href="/productos/nuevo">
              <Plus className="size-5" aria-hidden />
              Nuevo producto
            </ButtonLink>
          </>
        }
      />
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-xl bg-surface-2" />}>
        <Products />
      </Suspense>
    </div>
  );
}
