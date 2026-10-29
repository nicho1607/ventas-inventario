import "server-only";
import { prisma } from "@/lib/db";
import type { InventoryMovementType } from "@/generated/prisma/enums";

export const MOVEMENTS_PAGE_SIZE = 50;

const movementSelect = {
  id: true,
  type: true,
  quantity: true,
  stockBefore: true,
  stockAfter: true,
  unitCost: true,
  reason: true,
  createdAt: true,
  product: { select: { id: true, name: true } },
  sale: { select: { id: true, folio: true } },
} as const;

export type MovementRow = Awaited<ReturnType<typeof getMovements>>["rows"][number];

export async function getMovements({ type, page }: { type?: InventoryMovementType; page: number }) {
  const where = type ? { type } : {};
  const [rows, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where,
      select: movementSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * MOVEMENTS_PAGE_SIZE,
      take: MOVEMENTS_PAGE_SIZE,
    }),
    prisma.inventoryLog.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / MOVEMENTS_PAGE_SIZE)) };
}

export async function getProductMovements(productId: string, take = 40) {
  return prisma.inventoryLog.findMany({
    where: { productId },
    select: movementSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}
