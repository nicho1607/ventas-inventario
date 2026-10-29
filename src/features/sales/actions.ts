"use server";

import { revalidatePath } from "next/cache";
import { createSaleSchema, type CreateSaleInput } from "./schemas";
import { createSale, SaleError, type SaleReceipt } from "./services/create-sale";
import { voidSale, VoidSaleError } from "./services/void-sale";
import { StockError } from "@/features/inventory/services/stock";

export type VoidSaleResult = { ok: true } | { ok: false; message: string };

export async function voidSaleAction(saleId: string, reason: string): Promise<VoidSaleResult> {
  const trimmed = reason.trim();
  if (trimmed.length < 3) return { ok: false, message: "Escribe el motivo de la anulación" };
  if (trimmed.length > 200) return { ok: false, message: "El motivo es demasiado largo" };
  try {
    await voidSale(saleId, trimmed);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    if (e instanceof VoidSaleError || e instanceof StockError) return { ok: false, message: e.message };
    console.error("voidSaleAction", e);
    return { ok: false, message: "No se pudo anular la venta. Intenta de nuevo." };
  }
}

export type CreateSaleResult =
  | { ok: true; sale: SaleReceipt }
  | { ok: false; code: SaleError["code"] | "INVALID" | "UNKNOWN"; message: string; productId?: string; available?: number };

export async function createSaleAction(input: CreateSaleInput): Promise<CreateSaleResult> {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID", message: parsed.error.issues[0]?.message ?? "Datos de venta inválidos" };
  }

  try {
    const sale = await createSale(parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, sale };
  } catch (e) {
    if (e instanceof SaleError) {
      // El stock cambió: refrescar para que el POS muestre las existencias reales
      revalidatePath("/", "layout");
      return { ok: false, code: e.code, message: e.message, productId: e.productId, available: e.available };
    }
    console.error("createSaleAction", e);
    return { ok: false, code: "UNKNOWN", message: "No se pudo registrar la venta. Intenta de nuevo." };
  }
}
