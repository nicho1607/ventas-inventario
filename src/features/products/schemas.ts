import { z } from "zod";

const money = (label: string) => z.int(`${label}: escribe un valor en pesos`).min(0, `${label} no puede ser negativo`);

// Vender por debajo del costo no se bloquea (liquidaciones); el formulario solo lo advierte
export const productSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del producto").max(120),
  sku: z
    .string()
    .trim()
    .max(40)
    .transform((s) => s || null)
    .nullable()
    .default(null),
  categoryId: z.string().nullable().default(null),
  costPrice: money("Precio de compra"), // centavos
  salePrice: money("Precio de venta").refine((v) => v > 0, "El precio de venta debe ser mayor que 0"),
  minStock: z.int("Escribe un número entero").min(0, "No puede ser negativo").max(100_000),
});

export const createProductSchema = productSchema.and(
  z.object({ initialStock: z.int("Escribe un número entero").min(0, "No puede ser negativo").max(1_000_000) }),
);

export type ProductInput = z.input<typeof productSchema>;
export type CreateProductInput = z.input<typeof createProductSchema>;
