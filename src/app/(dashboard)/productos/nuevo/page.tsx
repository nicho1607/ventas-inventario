import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/ui";
import { getCategories } from "@/features/products/queries";
import { ProductForm } from "@/features/products/components/product-form";

export const metadata: Metadata = { title: "Nuevo producto" };

async function Form() {
  await connection();
  const categories = await getCategories();
  return <ProductForm categories={categories} />;
}

export default function NewProductPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <PageHeader title="Nuevo producto" />
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-xl bg-surface-2" />}>
        <Form />
      </Suspense>
    </div>
  );
}
