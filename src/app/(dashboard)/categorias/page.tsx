import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { getCategoriesWithCounts } from "@/features/categories/queries";
import { CategoryManager } from "@/features/categories/components/category-manager";

export const metadata: Metadata = { title: "Categorías" };

async function Categories() {
  await connection();
  const categories = await getCategoriesWithCounts();
  return <CategoryManager categories={categories} />;
}

export default function CategoriesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <Link href="/productos" className="inline-flex items-center gap-1 font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Productos
      </Link>
      <PageHeader title="Categorías" description="Agrupan los productos en Vender y en los reportes. El color identifica cada categoría." />
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-xl bg-surface-2" />}>
        <Categories />
      </Suspense>
    </div>
  );
}
