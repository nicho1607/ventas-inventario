import { z } from "zod";

/** Movimientos que se registran a mano (las ventas y anulaciones los genera el sistema) */
export const manualMovementTypes = ["PURCHASE", "ADJUSTMENT", "RETURN"] as const;

export const movementSchema = z
  .object({
    productId: z.string().min(1, "Elige un producto"),
    type: z.enum(manualMovementTypes),
    quantity: z.int("Escribe una cantidad entera").refine((q) => q !== 0, "La cantidad no puede ser 0"),
    unitCost: z.int().min(0).optional(), // centavos, solo compras
    updateCostPrice: z.boolean().default(false),
    reason: z.string().trim().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type !== "ADJUSTMENT" && v.quantity < 0) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Las compras y devoluciones suman stock" });
    }
    if (v.type === "ADJUSTMENT" && v.quantity < 0 && !v.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Indica el motivo de la salida (merma, daño, conteo…)" });
    }
  });

export type MovementInput = z.input<typeof movementSchema>;
