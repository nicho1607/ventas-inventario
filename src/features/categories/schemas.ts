import { z } from "zod";

/** Colores de identidad para categorías (chips del POS, tablas). Rojo y ámbar quedan para alertas de stock. */
export const categoryColors = [
  "#3b82f6",
  "#06b6d4",
  "#14b8a6",
  "#22c55e",
  "#84cc16",
  "#a16207",
  "#f97316",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
] as const;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Escribe un nombre de al menos 2 letras").max(40, "Máximo 40 caracteres"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Color inválido"),
});

export type CategoryInput = z.input<typeof categorySchema>;
