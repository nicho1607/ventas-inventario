import "server-only";
import { prisma } from "@/lib/db";
import { addDays, startOfDay, startOfMonth } from "@/lib/dates";
import type { PaymentMethod, Prisma } from "@/generated/prisma/client";

export const SALES_PAGE_SIZE = 40;

export const periods = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "7d", label: "Últimos 7 días" },
  { id: "mes", label: "Este mes" },
  { id: "todo", label: "Todo" },
] as const;
export type Period = (typeof periods)[number]["id"];

export function periodRange(period: Period, now = new Date()): { gte?: Date; lt?: Date } {
  const today = startOfDay(now);
  switch (period) {
    case "hoy":
      return { gte: today };
    case "ayer":
      return { gte: addDays(today, -1), lt: today };
    case "7d":
      return { gte: addDays(today, -6) };
    case "mes":
      return { gte: startOfMonth(now) };
    case "todo":
      return {};
  }
}

export type SalesFilter = {
  period: Period;
  method?: PaymentMethod;
  voided: boolean;
  folio?: number;
  page: number;
};

export async function getSales(f: SalesFilter) {
  // Buscar por folio ignora los demás filtros: el usuario busca una venta concreta
  const where: Prisma.SaleWhereInput = f.folio
    ? { folio: f.folio }
    : {
        createdAt: periodRange(f.period),
        ...(f.method && { paymentMethod: f.method }),
        ...(f.voided && { status: "VOIDED" }),
      };

  const summaryWhere: Prisma.SaleWhereInput = f.folio ? where : { ...where, status: "COMPLETED" };

  const [rows, total, byMethod, voidedCount] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * SALES_PAGE_SIZE,
      take: SALES_PAGE_SIZE,
      select: {
        id: true,
        folio: true,
        total: true,
        totalCost: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.sale.count({ where }),
    f.voided
      ? Promise.resolve([])
      : prisma.sale.groupBy({
          by: ["paymentMethod"],
          where: summaryWhere,
          _sum: { total: true, totalCost: true },
          _count: true,
        }),
    f.folio || f.voided
      ? Promise.resolve(0)
      : prisma.sale.count({ where: { ...where, status: "VOIDED" } }),
  ]);

  const revenue = byMethod.reduce((s, m) => s + (m._sum.total ?? 0), 0);
  const cost = byMethod.reduce((s, m) => s + (m._sum.totalCost ?? 0), 0);
  const count = byMethod.reduce((s, m) => s + m._count, 0);
  const methods = Object.fromEntries(byMethod.map((m) => [m.paymentMethod, { total: m._sum.total ?? 0, count: m._count }])) as Partial<
    Record<PaymentMethod, { total: number; count: number }>
  >;

  return {
    rows,
    total,
    pages: Math.max(1, Math.ceil(total / SALES_PAGE_SIZE)),
    summary: { revenue, profit: revenue - cost, count, methods, voidedCount },
  };
}

export async function getSale(id: string) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      items: { orderBy: { productName: "asc" } },
    },
  });
}
