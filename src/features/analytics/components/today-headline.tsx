import { connection } from "next/server";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { formatLongDay } from "@/lib/dates";
import { getTodaySummary } from "../queries";
import { Delta } from "./delta";

export async function TodayHeadline() {
  await connection(); // datos por request (cacheComponents)
  const today = await getTodaySummary();
  const dateLabel = formatLongDay(new Date());

  return (
    <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-ink-2 first-letter:uppercase">{dateLabel}</p>
        <h1 className="mt-1 max-w-[22ch] font-display text-[2.1rem] leading-[1.08] font-bold tracking-tight text-ink md:text-5xl">
          {today.count === 0 ? (
            "Todavía no hay ventas hoy."
          ) : (
            <>
              Hoy llevas <span className="figure font-extrabold">{formatMoney(today.revenue)}</span> en{" "}
              {today.count} {today.count === 1 ? "venta" : "ventas"}.
            </>
          )}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Delta current={today.revenue} previous={today.previousRevenue} label="vs. ayer a esta hora" />
          {today.count > 0 && (
            <span className="text-sm text-ink-2">
              Ganancia estimada <span className="figure font-bold text-ink">{formatMoney(today.profit)}</span>
            </span>
          )}
        </div>
      </div>
      <Link
        href="/pos"
        className="inline-flex h-14 items-center justify-center gap-2 self-start rounded-lg bg-brand px-6 text-lg font-bold text-brand-ink md:self-auto"
      >
        <ShoppingBasket className="size-5" aria-hidden />
        Registrar venta
      </Link>
    </section>
  );
}
