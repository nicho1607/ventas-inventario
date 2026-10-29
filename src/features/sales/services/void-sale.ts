import "server-only";
import { prisma } from "@/lib/db";
import { applyMovement } from "@/features/inventory/services/stock";

export class VoidSaleError extends Error {}

/**
 * Anula una venta: la marca VOIDED y devuelve al stock cada producto con un movimiento VOID.
 * El cambio de estado es condicional (solo desde COMPLETED), así que dos anulaciones
 * simultáneas no pueden devolver el stock dos veces.
 */
export async function voidSale(saleId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.sale.updateMany({
      where: { id: saleId, status: "COMPLETED" },
      data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason },
    });
    if (count === 0) {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, select: { status: true } });
      throw new VoidSaleError(sale ? "Esta venta ya estaba anulada" : "La venta no existe");
    }

    const items = await tx.saleItem.findMany({
      where: { saleId },
      select: { productId: true, quantity: true },
      orderBy: { productId: "asc" }, // orden de bloqueo estable
    });
    for (const item of items) {
      await applyMovement(tx, {
        productId: item.productId,
        type: "VOID",
        quantity: item.quantity,
        reason,
        saleId,
      });
    }
    return { restoredItems: items.length };
  });
}
