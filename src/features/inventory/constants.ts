import type { InventoryMovementType } from "@/generated/prisma/enums";

export const movementTypeLabels: Record<InventoryMovementType, string> = {
  INITIAL: "Stock inicial",
  PURCHASE: "Compra",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  RETURN: "Devolución",
  VOID: "Venta anulada",
};

export const movementTypes = Object.keys(movementTypeLabels) as InventoryMovementType[];
