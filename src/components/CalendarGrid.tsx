"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  chunkWeeks,
  DEFAULT_BOOKING_END_TIME,
  DEFAULT_BOOKING_START_TIME,
  formatBookingTimeRange,
  getMonthRangeGrid,
  isBookingDay,
  isWorkshopAllowedDate,
  isPastDate,
  toISODate,
  WORKSHOP_ALLOWED_RANGE,
} from "@/lib/dates";
import type { Booking } from "@/lib/types";
import {
  bookingAulaAccentColor,
  rgbaFromHex,
} from "@/lib/aula-colors";

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
            const active =
              booking && booking.status !== "cancelada" ? booking : null;
            return [iso, active] as const;
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
      {/* Solo escritorio: la vista móvil lleva su propia cabecera sticky */}
      <div className="hidden md:flex items-center justify-between gap-3 mb-4">
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
                const accentColor = bookingAulaAccentColor(booked.aula);
                return (
                  <div
                    key={iso}
                    title="Ocupado"
                    className={`${baseClasses} cursor-not-allowed bg-white/50 border-[color:var(--border)] text-[color:var(--muted)]`}
                    style={{
                      backgroundColor: rgbaFromHex(accentColor, 0.15),
                      borderColor: rgbaFromHex(accentColor, 0.35),
                    }}
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
                        backgroundColor: accentColor,
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

      {/* Mobile list: una sola cabecera de mes + scroll solo de la página */}
      <div className="md:hidden">
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 mb-3 bg-[color:var(--bg)]/95 backdrop-blur-sm border-b border-[color:var(--border)]/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-headings text-lg text-[color:var(--navy)] capitalize">
              {monthTitle}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
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
        </div>

        <div className="pb-2">
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
                      const accentColor = booked
                        ? bookingAulaAccentColor(booked.aula)
                        : null;
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
                          className={`w-full min-h-12 rounded-lg border text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? "bg-[color:var(--brown)] border-[color:var(--brown)] text-white"
                              : booked
                                ? "bg-white/50 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
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
                            booked && accentColor
                              ? {
                                  backgroundColor: rgbaFromHex(accentColor, 0.15),
                                  borderColor: rgbaFromHex(accentColor, 0.35),
                                }
                              : undefined
                          }
                        >
                          <span className="sr-only">
                            {booked ? "Día con reserva ocupada" : ""}
                          </span>
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {isToday || booked ? (
                              <div className="flex shrink-0 items-center justify-center gap-1">
                                {isToday ? (
                                  <span
                                    title="Hoy"
                                    className="w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)] ring-2 ring-[color:var(--cyan)]/25"
                                  />
                                ) : null}
                                {booked && accentColor ? (
                                  <span
                                    style={{
                                      backgroundColor: accentColor,
                                      width: 10,
                                      height: 10,
                                      borderRadius: 999,
                                    }}
                                  />
                                ) : null}
                              </div>
                            ) : null}
                            <div className="flex flex-col min-w-0 text-left">
                              <span className="text-sm font-semibold leading-tight">
                                {dayLabel}
                                {isToday ? (
                                  <span
                                    className={`ml-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                                      isSelected
                                        ? "text-white/90"
                                        : "text-[color:var(--cyan)] opacity-90"
                                    }`}
                                  >
                                    Hoy
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-xs opacity-80 leading-tight mt-0.5">
                                {format(d, "d MMMM", { locale: es })}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-semibold shrink-0 tabular-nums">
                            {booked
                              ? formatBookingTimeRange(
                                  booked.hora_inicio,
                                  booked.hora_fin
                                )
                              : formatBookingTimeRange(
                                  DEFAULT_BOOKING_START_TIME,
                                  DEFAULT_BOOKING_END_TIME
                                )}
                          </span>
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

