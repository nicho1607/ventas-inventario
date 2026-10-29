/**
 * Seed de datos de ejemplo: simula ~60 días de operación de una tienda de barrio.
 *
 * - Recorre día por día generando ventas, reabastecimientos y algunas anulaciones,
 *   manteniendo el stock consistente con la bitácora (InventoryLog).
 * - Usa un PRNG con semilla fija → mismo resultado en cada ejecución.
 * - Es re-ejecutable: limpia las tablas antes de insertar.
 *
 * Ejecutar: npx prisma db seed
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type InventoryMovementType,
  type PaymentMethod,
} from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ─────────────── Utilidades ───────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261029);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pesos = (n: number) => Math.round(n * 100);

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ─────────────── Catálogo ───────────────

const categories = [
  { name: "Bebidas", color: "#3b82f6" },
  { name: "Snacks", color: "#f59e0b" },
  { name: "Lácteos", color: "#06b6d4" },
  { name: "Panadería", color: "#a16207" },
  { name: "Abarrotes", color: "#22c55e" },
  { name: "Limpieza", color: "#8b5cf6" },
];

// Precios en pesos colombianos (COP)
// [sku, nombre, categoría, costo, venta, stockInicial, stockMínimo, popularidad]
type Row = [string, string, string, number, number, number, number, number];
const catalog: Row[] = [
  ["770100001", "Coca-Cola 400 ml", "Bebidas", 2300, 3500, 120, 24, 10],
  ["770100002", "Agua sin gas 600 ml", "Bebidas", 1200, 2000, 100, 20, 8],
  ["770100003", "Jugo de naranja 1 L", "Bebidas", 4200, 6200, 40, 10, 4],
  ["770100004", "Bebida energética 473 ml", "Bebidas", 4500, 6500, 48, 12, 4],
  ["770100005", "Café molido 250 g", "Bebidas", 9800, 13900, 24, 6, 2],
  ["770200001", "Papas fritas 45 g", "Snacks", 2000, 3000, 90, 20, 8],
  ["770200002", "Galletas de chocolate", "Snacks", 2500, 3800, 70, 15, 6],
  ["770200003", "Maní salado 100 g", "Snacks", 2600, 4000, 50, 10, 3],
  ["770200004", "Chocolatina", "Snacks", 1500, 2500, 60, 12, 5],
  ["770200005", "Crispetas para microondas", "Snacks", 2800, 4200, 30, 8, 2],
  ["770300001", "Leche entera 1 L", "Lácteos", 3500, 4800, 80, 20, 9],
  ["770300002", "Yogur natural 1 L", "Lácteos", 6200, 8900, 30, 8, 3],
  ["770300003", "Queso campesino 500 g", "Lácteos", 9500, 13500, 20, 6, 3],
  ["770300004", "Mantequilla 125 g", "Lácteos", 4300, 6200, 25, 6, 2],
  ["770400001", "Pan tajado blanco", "Panadería", 4800, 6900, 40, 10, 6],
  ["770400002", "Pan francés (unidad)", "Panadería", 300, 500, 200, 40, 9],
  ["770400003", "Pandebono (unidad)", "Panadería", 900, 1500, 80, 20, 6],
  ["770400004", "Arepas de maíz x5", "Panadería", 2800, 4000, 60, 15, 7],
  ["770500001", "Arroz 1 kg", "Abarrotes", 3600, 5200, 40, 10, 4],
  ["770500002", "Fríjol rojo 500 g", "Abarrotes", 4200, 6000, 35, 10, 4],
  ["770500003", "Aceite vegetal 1 L", "Abarrotes", 7800, 10900, 30, 8, 3],
  ["770500004", "Azúcar 1 kg", "Abarrotes", 3800, 5400, 35, 10, 3],
  ["770500005", "Huevos AA x30", "Abarrotes", 14500, 19500, 40, 10, 6],
  ["770500006", "Atún en lata 160 g", "Abarrotes", 4300, 6300, 50, 12, 4],
  ["770500007", "Pasta spaghetti 500 g", "Abarrotes", 2500, 3700, 60, 15, 4],
  ["770600001", "Detergente en polvo 1 kg", "Limpieza", 8200, 11900, 25, 6, 2],
  ["770600002", "Jabón de barra", "Limpieza", 1800, 2800, 40, 10, 2],
  ["770600003", "Papel higiénico x4", "Limpieza", 5200, 7500, 30, 8, 3],
  ["770600004", "Blanqueador 1 L", "Limpieza", 2800, 4200, 25, 6, 2],
  ["770600005", "Lavaloza líquido 500 ml", "Limpieza", 4400, 6500, 20, 6, 2],
];

// Productos que "se olvidó reabastecer" → terminan bajos o agotados para las alertas
const NEGLECTED_SKUS = new Set(["770100002", "770300003", "770400001", "770600005", "770200002"]);

const DAYS = 60;

// ─────────────── Simulación ───────────────

type SimProduct = {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  weight: number;
};

type LogRow = {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  unitCost: number | null;
  reason: string | null;
  saleId: string | null;
  createdAt: Date;
};

type SaleRow = {
  id: string;
  subtotal: number;
  discount: number;
  total: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  amountPaid: number | null;
  change: number | null;
  status: "COMPLETED" | "VOIDED";
  voidedAt: Date | null;
  voidReason: string | null;
  createdAt: Date;
};

type ItemRow = {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  lineTotal: number;
};

function cashTendered(total: number): number {
  const bills = [2_000, 5_000, 10_000, 20_000, 50_000, 100_000].map(pesos); // billetes COP
  if (rand() < 0.3) return total; // pago exacto
  return bills.find((b) => b >= total) ?? Math.ceil(total / pesos(50_000)) * pesos(50_000);
}

function pickPaymentMethod(): PaymentMethod {
  const r = rand();
  if (r < 0.55) return "CASH";
  if (r < 0.85) return "CARD";
  return "TRANSFER";
}

function atTime(day: Date, hour: number, minute: number): Date {
  const d = new Date(day);
  d.setHours(hour, minute, randInt(0, 59), 0);
  return d;
}

function simulate() {
  const products: SimProduct[] = catalog.map(
    ([sku, name, categoryName, cost, sale, initial, minStock, weight]) => ({
      id: randomUUID(),
      sku,
      name,
      categoryName,
      costPrice: pesos(cost),
      salePrice: pesos(sale),
      stock: initial,
      minStock,
      weight,
    }),
  );

  const logs: LogRow[] = [];
  const sales: SaleRow[] = [];
  const items: ItemRow[] = [];

  const log = (
    p: SimProduct,
    type: InventoryMovementType,
    quantity: number,
    createdAt: Date,
    extra: Partial<Pick<LogRow, "unitCost" | "reason" | "saleId">> = {},
  ) => {
    const stockBefore = p.stock;
    p.stock += quantity;
    logs.push({
      id: randomUUID(),
      productId: p.id,
      type,
      quantity,
      stockBefore,
      stockAfter: p.stock,
      unitCost: extra.unitCost ?? null,
      reason: extra.reason ?? null,
      saleId: extra.saleId ?? null,
      createdAt,
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - DAYS);

  // Stock inicial: el día anterior al arranque
  const initialStocks = products.map((p) => p.stock);
  products.forEach((p, i) => {
    p.stock = 0;
    log(p, "INITIAL", initialStocks[i], atTime(start, 7, 0), {
      unitCost: p.costPrice,
      reason: "Inventario inicial",
    });
  });

  for (let d = 1; d <= DAYS; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const isToday = day.getTime() === today.getTime();
    const weekday = day.getDay(); // 0 = domingo
    const isWeekend = weekday === 0 || weekday === 6;

    // Reabastecimiento los lunes a las 7:30
    if (weekday === 1) {
      const daysLeft = DAYS - d;
      for (const p of products) {
        if (NEGLECTED_SKUS.has(p.sku) && daysLeft < 21) continue;
        if (p.stock <= p.minStock * 2) {
          const qty = p.minStock * 4 - p.stock;
          log(p, "PURCHASE", qty, atTime(day, 7, 30), {
            unitCost: p.costPrice,
            reason: "Compra semanal a proveedor",
          });
        }
      }
    }

    // Merma ocasional
    if (rand() < 0.08) {
      const p = products[randInt(0, products.length - 1)];
      if (p.stock > 2) {
        log(p, "ADJUSTMENT", -randInt(1, 2), atTime(day, 20, 30), {
          reason: "Merma / producto dañado",
        });
      }
    }

    // Ventas del día (hoy solo hasta la hora actual)
    let salesCount = isWeekend ? randInt(28, 42) : randInt(18, 32);
    const lastHour = isToday ? Math.min(new Date().getHours(), 21) : 21;
    if (isToday) salesCount = Math.round(salesCount * Math.max(0, (lastHour - 8) / 13));

    const times = Array.from({ length: salesCount }, () => [randInt(8, Math.max(8, lastHour - 1)), randInt(0, 59)])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    for (const [hour, minute] of times) {
      const createdAt = atTime(day, hour, minute);
      const available = products.filter((p) => p.stock > 0);
      if (available.length === 0) break;

      // Armar carrito: 1-4 productos distintos
      const cart = new Map<SimProduct, number>();
      const lines = randInt(1, 4);
      for (let i = 0; i < lines; i++) {
        const p = pickWeighted(available);
        const already = cart.get(p) ?? 0;
        const maxQty = p.sku === "770400002" ? 10 : 3; // el pan francés se compra por varias unidades
        const qty = Math.min(randInt(1, maxQty), p.stock - already);
        if (qty > 0) cart.set(p, already + qty);
      }
      if (cart.size === 0) continue;

      const saleId = randomUUID();
      let subtotal = 0;
      let totalCost = 0;
      for (const [p, qty] of cart) {
        subtotal += p.salePrice * qty;
        totalCost += p.costPrice * qty;
        items.push({
          id: randomUUID(),
          saleId,
          productId: p.id,
          productName: p.name,
          unitPrice: p.salePrice,
          unitCost: p.costPrice,
          quantity: qty,
          lineTotal: p.salePrice * qty,
        });
        log(p, "SALE", -qty, createdAt, { saleId });
      }

      // ~4% con descuento: redondeo hacia abajo al millar de pesos
      const discount = subtotal > pesos(20_000) && rand() < 0.04 ? subtotal % pesos(1_000) : 0;
      const total = subtotal - discount;
      const paymentMethod = pickPaymentMethod();
      const amountPaid = paymentMethod === "CASH" ? cashTendered(total) : null;

      // ~1% de ventas anuladas: se devuelve el stock
      const voided = !isToday && rand() < 0.01;
      const voidedAt = voided ? new Date(createdAt.getTime() + 5 * 60_000) : null;
      if (voided) {
        for (const [p, qty] of cart) {
          log(p, "VOID", qty, voidedAt!, { saleId, reason: "Error de captura" });
        }
      }

      sales.push({
        id: saleId,
        subtotal,
        discount,
        total,
        totalCost,
        paymentMethod,
        amountPaid,
        change: amountPaid !== null ? amountPaid - total : null,
        status: voided ? "VOIDED" : "COMPLETED",
        voidedAt,
        voidReason: voided ? "Error de captura" : null,
        createdAt,
      });
    }
  }

  return { products, logs, sales, items };
}

// ─────────────── Persistencia ───────────────

async function main() {
  console.log("🧹 Limpiando tablas…");
  await prisma.inventoryLog.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  // Reinicia la secuencia del folio para que empiece en #1
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Sale_folio_seq" RESTART WITH 1`);

  console.log("🎲 Simulando operación…");
  const { products, logs, sales, items } = simulate();

  await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  const categoryIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const created = await prisma.category.create({ data: { ...c, sortOrder: i } });
    categoryIds.set(c.name, created.id);
  }

  await prisma.product.createMany({
    data: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryId: categoryIds.get(p.categoryName)!,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      stock: p.stock,
      minStock: p.minStock,
    })),
  });

  // Inserción en lotes y en orden cronológico (folio autoincremental ascendente)
  const chunk = <T>(arr: T[], size = 1000) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

  for (const batch of chunk(sales)) await prisma.sale.createMany({ data: batch });
  for (const batch of chunk(items)) await prisma.saleItem.createMany({ data: batch });
  for (const batch of chunk(logs)) await prisma.inventoryLog.createMany({ data: batch });

  const low = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const out = products.filter((p) => p.stock === 0).length;
  console.log(
    `✅ ${categories.length} categorías, ${products.length} productos, ${sales.length} ventas, ` +
      `${items.length} líneas, ${logs.length} movimientos. Stock bajo: ${low}, agotados: ${out}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
