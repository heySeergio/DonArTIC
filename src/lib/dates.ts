import { addDays, endOfMonth, endOfWeek, format, isAfter, isValid, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export type BookingDay = "lunes" | "miércoles" | "viernes";

export function parseISODate(isoDate: string): Date | null {
  const d = parseISO(isoDate);
  return isValid(d) ? d : null;
}

export function toISODate(date: Date): string {
  // date-fns format as yyyy-MM-dd
  return format(date, "yyyy-MM-dd");
}

export function isBookingDay(date: Date): boolean {
  // JS: getDay => 0 domingo, 1 lunes, ... 5 viernes
  const day = date.getDay();
  return day === 1 || day === 3 || day === 5;
}

export function getBookingDayLabel(date: Date): BookingDay {
  const day = date.getDay();
  if (day === 1) return "lunes";
  if (day === 3) return "miércoles";
  return "viernes";
}

export function formatSpanishDate(date: Date): string {
  // “7 de abril”
  return format(date, "d 'de' MMMM", { locale: es });
}

export function formatSpanishWeekday(date: Date): string {
  // “lunes”
  return format(date, "EEEE", { locale: es }).toLowerCase();
}

export function isFutureDate(date: Date): boolean {
  const now = new Date();
  return isAfter(date, now);
}

export function isPastDate(date: Date): boolean {
  const now = new Date();
  return !isAfter(date, now);
}

export function getMonthRangeGrid(monthDate: Date): Date[] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  // Semana “europea”: lunes como inicio
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const out: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function chunkWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// Calendario laboral (según captura del usuario) para 2026:
// Se permiten únicamente las celdas "Días laborables" (rosas) en el rango
// de marzo a junio. En esta app los talleres solo ocurren L/X/V, por lo que
// el set contiene únicamente esas fechas laborables.
const WORKSHOP_ALLOWED_ISO_DATES_2026 = new Set<string>([
  // Marzo (L/X/V)
  "2026-03-02",
  "2026-03-04",
  "2026-03-06",
  "2026-03-09",
  "2026-03-11",
  "2026-03-13",
  "2026-03-16",
  "2026-03-18",
  "2026-03-20",
  "2026-03-23",
  "2026-03-25",
  "2026-03-27",

  // Abril (L/X/V)
  "2026-04-08",
  "2026-04-10",
  "2026-04-13",
  "2026-04-15",
  "2026-04-17",
  "2026-04-20",
  "2026-04-22",
  "2026-04-27",
  "2026-04-29",

  // Mayo (L/X/V)
  "2026-05-04",
  "2026-05-08",
  "2026-05-11",
  "2026-05-13",
  "2026-05-15",
  "2026-05-18",
  "2026-05-20",
  "2026-05-22",
  "2026-05-25",
  "2026-05-27",
  "2026-05-29",

  // Junio (L/X/V)
  "2026-06-01",
]);

export function isWorkshopAllowedISO(isoDate: string): boolean {
  return WORKSHOP_ALLOWED_ISO_DATES_2026.has(isoDate);
}

export function isWorkshopAllowedDate(date: Date): boolean {
  return isWorkshopAllowedISO(toISODate(date));
}

export const WORKSHOP_ALLOWED_RANGE = {
  minISO: "2026-03-01",
  maxISO: "2026-06-30",
};


