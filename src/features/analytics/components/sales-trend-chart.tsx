"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";
import { TIME_ZONE } from "@/lib/dates";
import type { TrendPoint } from "../queries";

type Granularity = "day" | "month";

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const fmt = {
  day: new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, day: "numeric", month: "short" }),
  dayLong: new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }),
  month: new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, month: "short" }),
  monthLong: new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, month: "long", year: "numeric" }),
};

export function SalesTrendChart({ daily, monthly }: { daily: TrendPoint[]; monthly: TrendPoint[] }) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const data = granularity === "day" ? daily : monthly;
  const lastIndex = data.length - 1;
  const total = data.reduce((s, p) => s + p.revenue, 0);

  const tickLabel = (iso: string) => (granularity === "day" ? fmt.day : fmt.month).format(new Date(iso));
  const longLabel = (iso: string) => (granularity === "day" ? fmt.dayLong : fmt.monthLong).format(new Date(iso));

  return (
    <section aria-labelledby="trend-title" className="rounded-xl border border-line bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="trend-title" className="font-display text-lg font-bold">
            Ventas {granularity === "day" ? "de los últimos 30 días" : "de los últimos 12 meses"}
          </h2>
          <p className="figure text-2xl font-bold text-ink">{formatMoney(total)}</p>
        </div>
        <div role="group" aria-label="Periodo" className="flex rounded-lg bg-surface-2 p-1">
          {(["day", "month"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={granularity === g}
              onClick={() => setGranularity(g)}
              className="h-9 rounded-md px-3 text-sm font-semibold text-ink-2 aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
            >
              {g === "day" ? "Por día" : "Por mes"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-64" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
            <XAxis
              dataKey="date"
              tickFormatter={tickLabel}
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              tick={{ fill: "var(--ink-3)", fontSize: 12 }}
              interval={granularity === "day" ? 6 : 0}
              minTickGap={8}
            />
            <YAxis
              tickFormatter={(v: number) => `$${compact.format(v / 100)}`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--ink-3)", fontSize: 12 }}
              width={56}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as TrendPoint | undefined) : undefined;
                if (!p) return null;
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
                    <p className="text-ink-2 first-letter:uppercase">{longLabel(p.date)}</p>
                    <p className="figure text-lg font-bold text-ink">{formatMoney(p.revenue)}</p>
                    <p className="text-ink-2">{p.count} ventas</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {data.map((p, i) => (
                // El periodo en curso está incompleto: se muestra atenuado
                <Cell key={p.key} fill={i === lastIndex ? "var(--chart-muted)" : "var(--chart)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        La última barra es {granularity === "day" ? "hoy" : "el mes en curso"} y aún no está completa.
      </p>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">Ver como tabla</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-ink-3">
            <tr>
              <th className="py-1 font-semibold">{granularity === "day" ? "Día" : "Mes"}</th>
              <th className="py-1 text-right font-semibold">Ventas</th>
              <th className="py-1 text-right font-semibold">Ingresos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...data].reverse().map((p) => (
              <tr key={p.key}>
                <td className="py-1 first-letter:uppercase">{longLabel(p.date)}</td>
                <td className="figure py-1 text-right">{p.count}</td>
                <td className="figure py-1 text-right">{formatMoney(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
