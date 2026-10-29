import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getPosCatalog } from "@/features/products/queries";
import { getStoreSettings } from "@/features/settings/queries";
import { PosScreen } from "@/features/sales/components/pos-screen";

export const metadata: Metadata = { title: "Vender" };

async function PosCatalog() {
  await connection(); // stock en vivo en cada request (cacheComponents)
  const [{ products, categories }, settings] = await Promise.all([getPosCatalog(), getStoreSettings()]);
  return <PosScreen products={products} categories={categories} storeName={settings.name} />;
}

export default function PosPage() {
  return (
    <Suspense fallback={<div aria-hidden className="m-4 h-[60dvh] animate-pulse rounded-xl bg-surface-2 md:m-6" />}>
      <PosCatalog />
    </Suspense>
  );
}
