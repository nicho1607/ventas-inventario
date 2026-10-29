import "server-only";
import { prisma } from "@/lib/db";
import { addDays, addMonths, dayKey, monthKey, startOfDay, startOfMonth, UTC_OFFSET_HOURS } from "@/lib/dates";

const completed = { status: "COMPLETED" } as const;

async function salesTotals(from: Date, to: Date) {
  const r = await prisma.sale.aggregate({
    where: { ...completed, createdAt: { gte: from, lt: to } },
    _sum: { total: true, totalCost: true },
    _count: true,
  });
  const revenue = r._sum.total ?? 0;
  return { revenue, profit: revenue - (r._sum.totalCost ?? 0), count: r._count };
}

/** Hoy vs. ayer a la misma hora (comparación justa a mitad del día) */
export async function getTodaySummary(now = new Date()) {
  const today = startOfDay(now);
  const yesterday = addDays(today, -1);
  const sameTimeYesterday = new Date(now.getTime() - 24 * 3_600_000);
  const [current, previous] = await Promise.all([
    salesTotals(today, now),
    salesTotals(yesterday, sameTimeYesterday),
  ]);
  return { ...current, previousRevenue: previous.revenue, previousCount: previous.count };
}

/** Mes en curso vs. el mismo tramo del mes anterior */
export async function getMonthSummary(now = new Date()) {
  const month = startOfMonth(now);
  const prevMonth = addMonths(month, -1);
  const elapsed = now.getTime() - month.getTime();
  const prevCutoff = new Date(Math.min(prevMonth.getTime() + elapsed, month.getTime()));
  const [current, previous] = await Promise.all([salesTotals(month, now), salesTotals(prevMonth, prevCutoff)]);
  return {
    ...current,
    averageTicket: current.count ? Math.round(current.revenue / current.count) : 0,
    previousRevenue: previous.revenue,
    previousProfit: previous.profit,
  };
}

export type TrendPoint = { key: string; date: string; revenue: number; count: number };

/** Ventas por día (últimos `days`) o por mes (últimos `months`), con huecos rellenados en 0 */
export async function getSalesTrend(granularity: "day" | "month", now = new Date()): Promise<TrendPoint[]> {
  const from = granularity === "day" ? addDays(startOfDay(now), -29) : addMonths(startOfMonth(now), -11);
  // createdAt se guarda en UTC: se desplaza a hora de Bogotá antes de truncar
  const rows = await prisma.$queryRawUnsafe<{ bucket: Date; revenue: bigint; count: number }[]>(
    `SELECT date_trunc('${granularity}', "createdAt" + make_interval(hours => $2)) AS bucket,
            SUM(total)::bigint AS revenue, COUNT(*)::int AS count
       FROM "Sale"
      WHERE status = 'COMPLETED' AND "createdAt" >= $1::timestamp
      GROUP BY 1 ORDER BY 1`,
    // texto UTC sin zona: independiente del TimeZone de la sesión de Postgres
    from.toISOString().slice(0, 23),
    UTC_OFFSET_HOURS,
  );
  // bucket llega como "medianoche local" expresada en UTC → la clave se arma en UTC
  const toKey = (d: Date) => d.toISOString().slice(0, granularity === "day" ? 10 : 7);
  const byKey = new Map(rows.map((r) => [toKey(r.bucket), r]));

  const points: TrendPoint[] = [];
  const steps = granularity === "day" ? 30 : 12;
  for (let i = 0; i < steps; i++) {
    const d = granularity === "day" ? addDays(from, i) : addMonths(from, i);
    const key = granularity === "day" ? dayKey(d) : monthKey(d);
    const row = byKey.get(key);
    points.push({ key, date: d.toISOString(), revenue: Number(row?.revenue ?? 0), count: row?.count ?? 0 });
  }
  return points;
}

/** Top productos del mes por unidades vendidas */
export async function getTopProducts(now = new Date(), take = 5) {
  const rows = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { sale: { ...completed, createdAt: { gte: startOfMonth(now) } } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });
  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.productId) } },
    select: { id: true, name: true },
  });
  const names = new Map(products.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    productId: r.productId,
    name: names.get(r.productId) ?? "Producto",
    units: r._sum.quantity ?? 0,
    revenue: r._sum.lineTotal ?? 0,
  }));
}

/** Productos agotados o en el mínimo: primero los agotados */
export async function getCriticalStock() {
  return prisma.product.findMany({
    where: { isActive: true, stock: { lte: prisma.product.fields.minStock } },
    select: { id: true, name: true, stock: true, minStock: true },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
  });
}

export async function getRecentSales(take = 8) {
  return prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      folio: true,
      total: true,
      paymentMethod: true,
      status: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });
}
