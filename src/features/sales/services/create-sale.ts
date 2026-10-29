import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { z } from "zod";
import type { createSaleSchema } from "../schemas";

type Input = z.output<typeof createSaleSchema>;

export type SaleReceipt = {
  id: string;
  folio: number;
  total: number;
  change: number | null;
  paymentMethod: Input["paymentMethod"];
};

export class SaleError extends Error {
  constructor(
    public code: "INSUFFICIENT_STOCK" | "PRODUCT_UNAVAILABLE" | "INSUFFICIENT_PAYMENT",
    message: string,
    public productId?: string,
    public available?: number,
  ) {
    super(message);
  }
}

const receiptSelect = { id: true, folio: true, total: true, change: true, paymentMethod: true } as const;

/**
 * Registra una venta de forma atómica:
 * precios tomados de la BD (nunca del cliente), descuento condicional de stock
 * (no permite sobreventa), snapshot de precio/costo y bitácora de inventario.
 * Idempotente por clientRequestId.
 */
export async function createSale(input: Input): Promise<SaleReceipt> {
  const existing = await prisma.sale.findUnique({
    where: { clientRequestId: input.clientRequestId },
    select: receiptSelect,
  });
  if (existing) return existing;

  // Unificar líneas repetidas y ordenar por id → orden de bloqueo estable (evita deadlocks)
  const quantities = new Map<string, number>();
  for (const { productId, quantity } of input.items) {
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  const lines = [...quantities].sort(([a], [b]) => a.localeCompare(b));

  try {
    return await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: lines.map(([id]) => id) }, isActive: true },
        select: { id: true, name: true, salePrice: true, costPrice: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const stockAfter = new Map<string, number>();
      for (const [productId, quantity] of lines) {
        const product = byId.get(productId);
        if (!product) {
          throw new SaleError("PRODUCT_UNAVAILABLE", "Un producto del carrito ya no está disponible", productId);
        }
        const [updated] = await tx.product.updateManyAndReturn({
          where: { id: productId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
          select: { stock: true },
        });
        if (!updated) {
          const current = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
          throw new SaleError(
            "INSUFFICIENT_STOCK",
            `No hay suficiente ${product.name}: quedan ${current?.stock ?? 0}`,
            productId,
            current?.stock ?? 0,
          );
        }
        stockAfter.set(productId, updated.stock);
      }

      const items = lines.map(([productId, quantity]) => {
        const p = byId.get(productId)!;
        return {
          productId,
          productName: p.name,
          unitPrice: p.salePrice,
          unitCost: p.costPrice,
          quantity,
          lineTotal: p.salePrice * quantity,
        };
      });

      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      const totalCost = items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
      const discount = Math.min(input.discount, subtotal);
      const total = subtotal - discount;

      let amountPaid: number | null = null;
      let change: number | null = null;
      if (input.paymentMethod === "CASH") {
        amountPaid = input.amountPaid ?? total;
        if (amountPaid < total) {
          throw new SaleError("INSUFFICIENT_PAYMENT", "El efectivo recibido no alcanza para el total");
        }
        change = amountPaid - total;
      }

      const sale = await tx.sale.create({
        data: {
          clientRequestId: input.clientRequestId,
          subtotal,
          discount,
          total,
          totalCost,
          paymentMethod: input.paymentMethod,
          amountPaid,
          change,
          note: input.note,
          items: { create: items },
        },
        select: receiptSelect,
      });

      await tx.inventoryLog.createMany({
        data: lines.map(([productId, quantity]) => {
          const after = stockAfter.get(productId)!;
          return {
            productId,
            type: "SALE" as const,
            quantity: -quantity,
            stockBefore: after + quantity,
            stockAfter: after,
            saleId: sale.id,
          };
        }),
      });

      return sale;
    });
  } catch (e) {
    // Dos envíos simultáneos con el mismo clientRequestId: gana uno, el otro devuelve esa venta
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const sale = await prisma.sale.findUnique({
        where: { clientRequestId: input.clientRequestId },
        select: receiptSelect,
      });
      if (sale) return sale;
    }
    throw e;
  }
}
