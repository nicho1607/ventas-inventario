import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { InventoryMovementType } from "@/generated/prisma/enums";

export class StockError extends Error {
  constructor(
    message: string,
    public available: number,
  ) {
    super(message);
  }
}

type Movement = {
  productId: string;
  type: InventoryMovementType;
  quantity: number; // con signo
  unitCost?: number | null;
  reason?: string | null;
  saleId?: string | null;
};

/**
 * Aplica un movimiento de stock dentro de una transacción y lo deja en la bitácora.
 * Las salidas usan un update condicional: el stock nunca queda negativo,
 * aunque dos personas registren movimientos al mismo tiempo.
 */
export async function applyMovement(tx: Prisma.TransactionClient, m: Movement) {
  const where = m.quantity < 0 ? { id: m.productId, stock: { gte: -m.quantity } } : { id: m.productId };
  const [updated] = await tx.product.updateManyAndReturn({
    where,
    data: { stock: { increment: m.quantity } },
    select: { stock: true, name: true },
  });

  if (!updated) {
    const current = await tx.product.findUnique({ where: { id: m.productId }, select: { stock: true, name: true } });
    if (!current) throw new StockError("El producto no existe", 0);
    throw new StockError(`No puedes sacar ${-m.quantity} de ${current.name}: solo hay ${current.stock}`, current.stock);
  }

  const log = await tx.inventoryLog.create({
    data: {
      productId: m.productId,
      type: m.type,
      quantity: m.quantity,
      stockBefore: updated.stock - m.quantity,
      stockAfter: updated.stock,
      unitCost: m.unitCost ?? null,
      reason: m.reason || null,
      saleId: m.saleId ?? null,
    },
    select: { id: true, stockBefore: true, stockAfter: true, quantity: true },
  });

  return { ...log, productName: updated.name };
}
