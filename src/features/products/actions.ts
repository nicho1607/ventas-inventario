"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { applyMovement } from "@/features/inventory/services/stock";
import { createProductSchema, productSchema, type CreateProductInput, type ProductInput } from "./schemas";

export type ProductResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function invalid(error: z.ZodError): ProductResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { ok: false, message: "Revisa los campos marcados", fieldErrors };
}

function handleError(e: unknown, where: string): ProductResult {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { ok: false, message: "Ya existe un producto con ese código", fieldErrors: { sku: "Este código ya está en uso" } };
  }
  console.error(where, e);
  return { ok: false, message: "No se pudo guardar el producto. Intenta de nuevo." };
}

export async function createProductAction(input: CreateProductInput): Promise<ProductResult> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { initialStock, ...data } = parsed.data;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: { ...data, stock: 0 }, select: { id: true } });
      if (initialStock > 0) {
        await applyMovement(tx, {
          productId: created.id,
          type: "INITIAL",
          quantity: initialStock,
          unitCost: data.costPrice,
          reason: "Stock inicial",
        });
      }
      return created;
    });
    revalidatePath("/", "layout");
    return { ok: true, id: product.id };
  } catch (e) {
    return handleError(e, "createProductAction");
  }
}

export async function updateProductAction(id: string, input: ProductInput): Promise<ProductResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    // El stock NO se edita aquí: solo cambia mediante movimientos de inventario
    await prisma.product.update({ where: { id }, data: parsed.data });
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return handleError(e, "updateProductAction");
  }
}

/** Archivar en vez de borrar: el producto tiene ventas e historial que deben conservarse */
export async function setProductActiveAction(id: string, isActive: boolean): Promise<ProductResult> {
  try {
    await prisma.product.update({ where: { id }, data: { isActive } });
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return handleError(e, "setProductActiveAction");
  }
}
