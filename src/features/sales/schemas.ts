import { z } from "zod";

export const paymentMethods = ["CASH", "TRANSFER", "CARD"] as const;

export const paymentMethodLabels: Record<(typeof paymentMethods)[number], string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
};

export const createSaleSchema = z.object({
  clientRequestId: z.uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.int().positive().max(9999),
      }),
    )
    .min(1, "El carrito está vacío"),
  discount: z.int().min(0).default(0), // centavos
  paymentMethod: z.enum(paymentMethods),
  amountPaid: z.int().min(0).optional(), // centavos, solo efectivo
  note: z.string().max(200).optional(),
});

export type CreateSaleInput = z.input<typeof createSaleSchema>;
