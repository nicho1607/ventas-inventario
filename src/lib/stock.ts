export type StockStatus = "ok" | "low" | "out";

export function stockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock <= minStock) return "low";
  return "ok";
}
