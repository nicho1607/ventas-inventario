import { connection } from "next/server";
import { formatMoney } from "@/lib/money";
import { formatMonthName } from "@/lib/dates";
import { getCriticalStock, getMonthSummary } from "../queries";
import { Delta } from "./delta";

export async function MonthStrip() {
  await connection(); // datos por request (cacheComponents)
  const [month, critical] = await Promise.all([getMonthSummary(), getCriticalStock()]);
  const margin = month.revenue ? Math.round((month.profit / month.revenue) * 100) : 0;
  const outCount = critical.filter((p) => p.stock <= 0).length;
  const monthName = formatMonthName(new Date());

  const items = [
    {
      label: `Ingresos de ${monthName}`,
      value: formatMoney(month.revenue),
      detail: <Delta current={month.revenue} previous={month.previousRevenue} label="vs. mes anterior" />,
    },
    {
      label: "Ganancia estimada",
      value: formatMoney(month.profit),
      detail: <span className="text-sm text-ink-2">Margen del {margin} % sobre ventas</span>,
    },
    {
      label: "Ticket promedio",
      value: formatMoney(month.averageTicket),
      detail: <span className="text-sm text-ink-2">{month.count.toLocaleString("es-CO")} ventas en el mes</span>,
    },
    {
      label: "Productos por reponer",
      value: String(critical.length),
      detail:
        critical.length === 0 ? (
          <span className="text-sm text-ink-2">Todo el inventario está sobre el mínimo</span>
        ) : (
          <span className="text-sm text-ink-2">
            <span className={outCount ? "font-semibold text-danger" : ""}>{outCount} agotados</span>,{" "}
            {critical.length - outCount} en el mínimo
          </span>
        ),
    },
  ];

  return (
    <section
      aria-label="Resumen del mes"
      className="grid grid-cols-1 divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
    >
      {items.map((item) => (
        <div key={item.label} className="py-4 sm:px-5 sm:py-5 lg:first:pl-0">
          <p className="text-sm text-ink-2 first-letter:uppercase">{item.label}</p>
          <p className="figure mt-1 text-3xl font-bold text-ink">{item.value}</p>
          <div className="mt-1">{item.detail}</div>
        </div>
      ))}
    </section>
  );
}
