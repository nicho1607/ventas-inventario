import "server-only";
import { prisma } from "@/lib/db";

export async function getCategoriesWithCounts() {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, color: true, _count: { select: { products: { where: { isActive: true } } } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
}

export type CategoryRow = Awaited<ReturnType<typeof getCategoriesWithCounts>>[number];
