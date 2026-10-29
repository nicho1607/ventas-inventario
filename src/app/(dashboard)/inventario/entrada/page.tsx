import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { getProductOptions } from "@/features/products/queries";
import { StockEntryForm } from "@/features/inventory/components/stock-entry-form";

export const metadata: Metadata = { title: "Registrar movimiento" };

async function Form({ searchParams }: { searchParams: PageProps<"/inventario/entrada">["searchParams"] }) {
  const sp = await searchParams;
  const products = await getProductOptions();
  const productId = typeof sp.producto === "string" ? sp.producto : undefined;
  return <StockEntryForm products={products} initialProductId={productId} />;
}

export default function StockEntryPage({ searchParams }: PageProps<"/inventario/entrada">) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Registrar movimiento"
        description="Compras a proveedores, salidas por merma y ajustes de conteo. Puedes registrar varios seguidos."
      />
      <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-xl bg-surface-2" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
