"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { movementSchema, type MovementInput } from "./schemas";
import { applyMovement, StockError } from "./services/stock";

export type MovementResult =
  | { ok: true; productName: string; quantity: number; stockBefore: number; stockAfter: number }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export async function registerMovementAction(input: MovementInput): Promise<MovementResult> {
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "Revisa los datos del movimiento", fieldErrors };
  }
  const v = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const log = await applyMovement(tx, {
        productId: v.productId,
        type: v.type,
        quantity: v.quantity,
        unitCost: v.type === "PURCHASE" ? v.unitCost : null,
        reason: v.reason,
      });
      if (v.type === "PURCHASE" && v.updateCostPrice && v.unitCost !== undefined) {
        await tx.product.update({ where: { id: v.productId }, data: { costPrice: v.unitCost } });
      }
      return log;
    });
    revalidatePath("/", "layout");
    return {
      ok: true,
      productName: result.productName,
      quantity: result.quantity,
      stockBefore: result.stockBefore,
      stockAfter: result.stockAfter,
    };
  } catch (e) {
    if (e instanceof StockError) return { ok: false, message: e.message, fieldErrors: { quantity: e.message } };
    console.error("registerMovementAction", e);
    return { ok: false, message: "No se pudo registrar el movimiento. Intenta de nuevo." };
  }
}
