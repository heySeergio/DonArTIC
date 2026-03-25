"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  chunkWeeks,
  getMonthRangeGrid,
  isBookingDay,
  isWorkshopAllowedDate,
  isPastDate,
  toISODate,
  WORKSHOP_ALLOWED_RANGE,
} from "@/lib/dates";
import type { Booking } from "@/lib/types";

function statusDotStyle(status: Booking["status"]) {
  switch (status) {
    case "confirmada":
      return { backgroundColor: "var(--cyan)" };
    case "pendiente":
      return { backgroundColor: "var(--yellow)" };
    case "cancelada":
      return { backgroundColor: "var(--muted)" };
  }
}

function bookingSpecialColor(aula: string): string | null {
  const normalized = aula
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  // Verde para 2º F/E/D/C (según indicación del usuario)
  const compact = normalized.replace(/\s+/g, "");
  const m2 = compact.match(/^2(?:º|°)([A-F])$/);
  if (m2?.[1] && ["C", "D", "E", "F"].includes(m2[1])) return "#91F539";

  // Verde para aulas AL (AL 1, AL 2, ...)
  if (normalized.startsWith("AL")) return "#91F539";

  // Amarillo para INFANTIL, MUSICA y TVA 5
  if (normalized === "INFANTIL") return "#FEF502";
  if (normalized === "MUSICA") return "#FEF502";
  const tvaMatch = normalized.match(/^TVA\s*(\d+)$/);
  if (tvaMatch?.[1] === "5") return "#FEF502";

  // Azul para TVA (no 5) y CONFECCION
  if (normalized.startsWith("TVA")) return "#0328B2";
  if (normalized.includes("CONFECCION")) return "#0328B2";

  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export default function CalendarGrid({
  selectedFecha,
  onSelectFecha,
  refreshKey,
  cooldownUntilISO,
}: {
  selectedFecha: string | null;
  onSelectFecha: (fechaISO: string) => void;
  refreshKey: number;
  cooldownUntilISO: string | null;
}) {
  const boundsStart = new Date(WORKSHOP_ALLOWED_RANGE.minISO);
  const boundsEnd = new Date(WORKSHOP_ALLOWED_RANGE.maxISO);
  const minMonth = startOfMonth(boundsStart);
  const maxMonth = startOfMonth(boundsEnd);

  const [monthDate, setMonthDate] = useState(() => {
    const now = startOfMonth(new Date());
    if (now < minMonth) return minMonth;
    if (now > maxMonth) return maxMonth;
    return now;
  });
  const [loading, setLoading] = useState(true);
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, Booking>>(
    {}
  );

  const todayISO = useMemo(() => toISODate(new Date()), []);

  const monthTitle = useMemo(
    () => format(monthDate, "MMMM yyyy", { locale: es }),
    [monthDate]
  );

  const monthDays = useMemo(() => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const out: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      out.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return out;
  }, [monthDate]);

  const interactiveISOsInMonth = useMemo(() => {
    return monthDays
      .filter((d) => isBookingDay(d) && isWorkshopAllowedDate(d))
      .map((d) => toISODate(d));
  }, [monthDays]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const results = await Promise.all(
          interactiveISOsInMonth.map(async (iso) => {
            const res = await fetch(`/api/bookings?fecha=${iso}`);
            if (!res.ok) return [iso, null] as const;
            const booking = (await res.json()) as Booking | null;
            return [iso, booking] as const;
          })
        );

        if (cancelled) return;
        const next: Record<string, Booking> = {};
        for (const [iso, booking] of results) {
          if (booking) next[iso] = booking;
        }
        setBookingsByDate(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [interactiveISOsInMonth, refreshKey]);

  const gridDays = useMemo(() => getMonthRangeGrid(monthDate), [monthDate]);
  const weeks = useMemo(() => chunkWeeks(gridDays), [gridDays]);

  const sameMonth = (d: Date) => d.getMonth() === monthDate.getMonth();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-headings text-lg text-[color:var(--navy)]">
          {monthTitle}
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthDate((d) => {
              const next = addMonths(d, -1);
              return next < minMonth ? minMonth : next;
            })}
            disabled={monthDate <= minMonth}
            className="h-9 w-9 rounded-full border border-[color:var(--border)] bg-white/70 hover:bg-white text-[color:var(--navy)]"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setMonthDate((d) => {
              const next = addMonths(d, 1);
              return next > maxMonth ? maxMonth : next;
            })}
            disabled={monthDate >= maxMonth}
            className="h-9 w-9 rounded-full border border-[color:var(--border)] bg-white/70 hover:bg-white text-[color:var(--navy)]"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-2 text-xs mb-2">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div
              key={d}
              className="text-center text-[color:var(--muted)] font-semibold"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeks.flat().map((date, idx) => {
            const iso = toISODate(date);
            const inMonth = sameMonth(date);
            const bookingDay = isBookingDay(date);
            const allowed = isWorkshopAllowedDate(date);
            const past = isPastDate(date);
            const booked = bookingsByDate[iso];
            const isSelected = selectedFecha === iso;
            const isToday = iso === todayISO;

            const cooldownBlocked = cooldownUntilISO
              ? iso < cooldownUntilISO
              : false;

            const clickable =
              inMonth &&
              bookingDay &&
              allowed &&
              !past &&
              !booked &&
              !loading &&
              !cooldownBlocked;
            const occupied = !!booked;

            const baseClasses =
              "relative h-14 rounded-lg border transition-colors flex items-center justify-center";

            if (loading) {
              return (
                <div
                  key={`${iso}-${idx}`}
                  className={`${baseClasses} bg-white/70 border-[color:var(--border)] animate-pulse`}
                  aria-hidden="true"
                />
              );
            }

            if (!inMonth) {
              return (
                <div
                  key={iso}
                  className={`${baseClasses} border-transparent bg-transparent text-[color:var(--muted)]`}
                >
                  <span className="text-sm">{date.getDate()}</span>
                </div>
              );
            }

            if (bookingDay) {
              if (occupied) {
                let specialColor = bookingSpecialColor(booked.aula);
                // Asignaciones manuales por fecha (marzo 2026)
                if (iso === "2026-03-23" || iso === "2026-03-24") {
                  specialColor = "#91F539";
                } else if (iso === "2026-03-20") {
                  specialColor = "#FEF502";
                }
                return (
                  <div
                    key={iso}
                    title="Ocupado"
                    className={`${baseClasses} cursor-not-allowed bg-[color:var(--magenta)]/15 border-[color:var(--magenta)]/35`}
                    style={
                      specialColor
                        ? {
                            backgroundColor: rgbaFromHex(specialColor, 0.15),
                            borderColor: rgbaFromHex(specialColor, 0.35),
                          }
                        : undefined
                    }
                  >
                    {isToday ? (
                      <span
                        aria-label="Hoy"
                        title="Hoy"
                        className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)]"
                      />
                    ) : null}
                    <span className="text-sm text-[color:var(--muted)]">
                      {date.getDate()}
                    </span>
                    <span
                      style={{
                        backgroundColor:
                          specialColor ??
                          statusDotStyle(booked.status).backgroundColor,
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 8,
                        height: 8,
                        borderRadius: 9999,
                      }}
                    />
                  </div>
                );
              }

              if (!allowed) {
                return (
                  <div
                    key={iso}
                    className={`${baseClasses} bg-white/50 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed`}
                  >
                    {isToday ? (
                      <span
                        aria-label="Hoy"
                        title="Hoy"
                        className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)]"
                      />
                    ) : null}
                    {date.getDate()}
                  </div>
                );
              }

              if (past) {
                return (
                  <div
                    key={iso}
                    className={`${baseClasses} bg-[color:var(--border)]/80 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed`}
                  >
                    {isToday ? (
                      <span
                        aria-label="Hoy"
                        title="Hoy"
                        className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)]"
                      />
                    ) : null}
                    {date.getDate()}
                  </div>
                );
              }

              if (cooldownBlocked) {
                return (
                  <div
                    key={iso}
                    title="Reservas bloqueadas hasta dos semanas después"
                    className={`${baseClasses} bg-[color:var(--border)]/55 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed`}
                  >
                    {isToday ? (
                      <span
                        aria-label="Hoy"
                        title="Hoy"
                        className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)]"
                      />
                    ) : null}
                    {date.getDate()}
                  </div>
                );
              }

              const hover =
                "hover:bg-[color:var(--cyan)]/15 hover:border-[color:var(--cyan)]/30";
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectFecha(iso)}
                  disabled={!clickable}
                  className={`${baseClasses} ${hover} ${
                    isSelected
                      ? "bg-[color:var(--brown)] border-[color:var(--brown)] text-white"
                      : "bg-white/70 border-[color:var(--border)] text-[color:var(--text)]"
                  }`}
                >
                  {isToday ? (
                    <span
                      aria-label="Hoy"
                      title="Hoy"
                      className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)]"
                    />
                  ) : null}
                  {date.getDate()}
                  {isSelected && (
                    <span className="absolute bottom-3 left-3 right-3 h-[2px] bg-white/40 rounded-full" />
                  )}
                </button>
              );
            }

            // No-booking days (Tue/Thu/Sat/Sun)
            return (
              <div
                key={iso}
                className={`${baseClasses} bg-[color:var(--border)]/30 border-[color:var(--border)]/40 text-[color:var(--muted)]`}
              >
                {isToday ? (
                  <span
                    aria-label="Hoy"
                    title="Hoy"
                    className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)]"
                  />
                ) : null}
                <span className="text-sm">{date.getDate()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile list */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="font-headings text-[16px] text-[color:var(--navy)]">
            {monthTitle}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setMonthDate((d) => {
                  const next = addMonths(d, -1);
                  return next < minMonth ? minMonth : next;
                })
              }
              disabled={monthDate <= minMonth}
              className="h-9 w-9 rounded-full border border-[color:var(--border)] bg-white/70 hover:bg-white text-[color:var(--navy)]"
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() =>
                setMonthDate((d) => {
                  const next = addMonths(d, 1);
                  return next > maxMonth ? maxMonth : next;
                })
              }
              disabled={monthDate >= maxMonth}
              className="h-9 w-9 rounded-full border border-[color:var(--border)] bg-white/70 hover:bg-white text-[color:var(--navy)]"
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto pb-2">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg border border-[color:var(--border)] bg-white/70 animate-pulse"
                />
              ))}
            </div>
          ) : (
            weeks.map((week, wIdx) => {
              const inMonthBookingDays = week.filter(
                (d) => sameMonth(d) && isBookingDay(d) && isWorkshopAllowedDate(d)
              );
              if (inMonthBookingDays.length === 0) return null;

              return (
                <div key={wIdx} className="mb-4">
                  <div className="text-xs font-semibold text-[color:var(--muted)] mb-2">
                    Semana de{" "}
                    {format(week[0], "d/M", { locale: es })}–{" "}
                    {format(week[6] ?? week[week.length - 1], "d/M", {
                      locale: es,
                    })}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {inMonthBookingDays.map((d) => {
                      const iso = toISODate(d);
                      const booked = bookingsByDate[iso];
                      const isToday = iso === todayISO;
                      let specialColor = booked ? bookingSpecialColor(booked.aula) : null;
                      // Asignaciones manuales por fecha (marzo 2026)
                      if (booked) {
                        if (iso === "2026-03-23" || iso === "2026-03-24") {
                          specialColor = "#91F539";
                        } else if (iso === "2026-03-20") {
                          specialColor = "#FEF502";
                        }
                      }
                      const past = isPastDate(d);
                      const isSelected = selectedFecha === iso;
                      const cooldownBlocked = cooldownUntilISO
                        ? iso < cooldownUntilISO
                        : false;
                      const disabled = past || !!booked || cooldownBlocked;

                      const dayLabel =
                        d.getDay() === 1
                          ? "Lunes"
                          : d.getDay() === 3
                            ? "Miércoles"
                            : "Viernes";

                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => onSelectFecha(iso)}
                          disabled={disabled}
                          className={`relative w-full h-12 rounded-lg border text-left px-3 flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? "bg-[color:var(--brown)] border-[color:var(--brown)] text-white"
                              : booked
                                ? specialColor
                                  ? "bg-white/50 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
                                  : "bg-[color:var(--magenta)]/15 border-[color:var(--magenta)]/35 text-[color:var(--muted)] cursor-not-allowed"
                                : past
                                  ? "bg-[color:var(--border)]/80 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
                                  : cooldownBlocked
                                    ? "bg-[color:var(--border)]/55 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
                                  : "bg-white/70 border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--cyan)]/15"
                          }`}
                          title={
                            booked
                              ? "Ocupado"
                              : cooldownBlocked
                                ? "Reservas bloqueadas hasta dos semanas después"
                                : undefined
                          }
                          style={
                            booked && specialColor
                              ? {
                                  backgroundColor: rgbaFromHex(specialColor, 0.15),
                                  borderColor: rgbaFromHex(specialColor, 0.35),
                                }
                              : undefined
                          }
                        >
                          {isToday ? (
                            <span
                              aria-label="Hoy"
                              title="Hoy"
                              className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)]"
                            />
                          ) : null}
                          <span className="sr-only">
                            {booked && specialColor
                              ? "Marcado en color TVA/Confección"
                              : ""}
                          </span>
                          <div className="flex items-center gap-3">
                            {booked && (
                              <span
                                style={{
                                  backgroundColor:
                                    specialColor ??
                                    statusDotStyle(booked.status).backgroundColor,
                                  width: 10,
                                  height: 10,
                                  borderRadius: 999,
                                }}
                              />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{dayLabel}</span>
                              <span className="text-xs opacity-80">
                                {format(d, "d MMMM", { locale: es })}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-semibold">{`13:00–14:30h`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

