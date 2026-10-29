// Zona horaria del negocio: Colombia (UTC-5, sin horario de verano).
// Los rangos "hoy" / "este mes" se calculan en hora de Bogotá, sin importar
// en qué zona horaria corra el servidor.

export const TIME_ZONE = "America/Bogota";
export const UTC_OFFSET_HOURS = -5;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Componentes de fecha (año, mes 0-11, día) en hora de Bogotá */
function localParts(date: Date) {
  const local = new Date(date.getTime() + UTC_OFFSET_HOURS * HOUR);
  return { y: local.getUTCFullYear(), m: local.getUTCMonth(), d: local.getUTCDate() };
}

/** Instante UTC de las 00:00 en Bogotá para (y, m, d) */
function bogotaMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - UTC_OFFSET_HOURS * HOUR);
}

export function startOfDay(date = new Date()): Date {
  const { y, m, d } = localParts(date);
  return bogotaMidnight(y, m, d);
}

export function startOfMonth(date = new Date()): Date {
  const { y, m } = localParts(date);
  return bogotaMidnight(y, m, 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

export function addMonths(date: Date, months: number): Date {
  const { y, m, d } = localParts(date);
  return bogotaMidnight(y, m + months, d);
}

/** Clave estable para agrupar: "2026-10-29" o "2026-10" */
export function dayKey(date: Date): string {
  const { y, m, d } = localParts(date);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function monthKey(date: Date): string {
  return dayKey(date).slice(0, 7);
}

const timeFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, month: "long" });

export const formatTime = (d: Date) => timeFmt.format(d);
export const formatDay = (d: Date) => dayFmt.format(d);
export const formatLongDay = (d: Date) => longDayFmt.format(d);
export const formatMonthName = (d: Date) => monthFmt.format(d);
