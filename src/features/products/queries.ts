import "server-only";
import { prisma } from "@/lib/db";

export type PosProduct = {
  id: string;
  sku: string | null;
  name: string;
  salePrice: number;
  stock: number;
  minStock: number;
  categoryId: string | null;
};

export type PosCategory = { id: string; name: string; color: string | null };

/** Catálogo completo para el POS: se carga una vez y se filtra en el cliente */
export async function getPosCatalog(): Promise<{ products: PosProduct[]; categories: PosCategory[] }> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true, salePrice: true, stock: true, minStock: true, categoryId: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, color: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  return { products, categories };
}

export type AdminProduct = Awaited<ReturnType<typeof getProductsAdmin>>[number];

/** Listado de administración: incluye archivados */
export async function getProductsAdmin() {
  return prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      costPrice: true,
      salePrice: true,
      stock: true,
      minStock: true,
      isActive: true,
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      sku: true,
      name: true,
      categoryId: true,
      costPrice: true,
      salePrice: true,
      stock: true,
      minStock: true,
      isActive: true,
    },
  });
}

export async function getCategories(): Promise<PosCategory[]> {
  return prisma.category.findMany({
    select: { id: true, name: true, color: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Lista liviana para el selector de producto de movimientos */
export async function getProductOptions() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, name: true, stock: true, minStock: true, costPrice: true },
    orderBy: { name: "asc" },
  });
}
export type ProductOption = Awaited<ReturnType<typeof getProductOptions>>[number];
