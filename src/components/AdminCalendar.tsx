"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  chunkWeeks,
  getMonthRangeGrid,
  isBookingDay,
  isWorkshopAllowedDate,
  isPastDate,
  parseISODate,
  WORKSHOP_ALLOWED_RANGE,
  toISODate,
  formatSpanishDate,
  formatSpanishWeekday,
} from "@/lib/dates";
import type { Booking, BookingStatus } from "@/lib/types";
import {
  bookingAulaAccentColor,
  rgbaFromHex,
} from "@/lib/aula-colors";

export default function AdminCalendar({
  adminPassword,
  refreshKey,
  onNeedRefresh,
}: {
  adminPassword: string;
  refreshKey: number;
  onNeedRefresh: () => void;
}) {
  const boundsStart = new Date(WORKSHOP_ALLOWED_RANGE.minISO);
  const boundsEnd = new Date(WORKSHOP_ALLOWED_RANGE.maxISO);
  const minMonth = new Date(boundsStart.getFullYear(), boundsStart.getMonth(), 1);
  const maxMonth = new Date(boundsEnd.getFullYear(), boundsEnd.getMonth(), 1);

  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    const n = new Date(now.getFullYear(), now.getMonth(), 1);
    if (n < minMonth) return minMonth;
    if (n > maxMonth) return maxMonth;
    return n;
  });
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  const todayISO = useMemo(() => toISODate(new Date()), []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        headers: { "x-admin-password": adminPassword },
      });
      if (!res.ok) throw new Error("No autorizado");
      const data = (await res.json()) as Booking[];
      setBookings(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, adminPassword]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking> = {};
    for (const b of bookings) {
      map[b.fecha] = b;
    }
    return map;
  }, [bookings]);

  const gridDays = useMemo(() => getMonthRangeGrid(monthDate), [monthDate]);
  const weeks = useMemo(() => chunkWeeks(gridDays), [gridDays]);

  const sameMonth = (d: Date) => d.getMonth() === monthDate.getMonth();

  const monthTitle = useMemo(
    () => format(monthDate, "MMMM yyyy", { locale: es }),
    [monthDate]
  );

  const selected = selectedISO ? bookingsByDate[selectedISO] : null;
  const selectedDate = selectedISO ? parseISODate(selectedISO) : null;

  const patch = async (booking: Booking, status: BookingStatus) => {
    await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify({ status }),
    });
    onNeedRefresh();
  };

  const bookingDayText = (date: Date) => {
    return isBookingDay(date) ? formatSpanishWeekday(date) : "—";
  };

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-headings text-lg text-[color:var(--navy)]">
          Calendario (Admin)
        </h2>
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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="font-headings text-sm text-[color:var(--muted)] mb-2">
            {monthTitle}
          </div>

          <div className="grid grid-cols-7 gap-2 mb-3 text-xs">
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
              const booked = bookingsByDate[iso];
              const isSelected = selectedISO === iso;
              const allowed = isWorkshopAllowedDate(date);
              const isToday = iso === todayISO;
              const accentColor = booked
                ? bookingAulaAccentColor(booked.aula)
                : null;

              if (loading) {
                return (
                  <div
                    key={`${iso}-${idx}`}
                    className="h-14 rounded-lg border border-[color:var(--border)] bg-white/70 animate-pulse"
                    aria-hidden="true"
                  />
                );
              }

              // Solo se puede seleccionar lo que aparece como “laborable” en el calendario.
              // Si por cualquier motivo existe una reserva, permitimos selección para verla.
              const clickable = (inMonth && allowed) || !!booked;
              const past = isPastDate(date);
              const muted = !inMonth ? "opacity-60" : "";

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedISO(iso)}
                  className={`relative h-14 rounded-lg border transition-colors overflow-hidden ${muted} ${
                    isSelected
                      ? "bg-[color:var(--brown)] border-[color:var(--brown)] text-white"
                      : booked
                        ? "bg-white border-[color:var(--border)] hover:bg-[color:var(--cyan)]/10"
                      : inMonth && allowed && isBookingDay(date)
                        ? past
                          ? "bg-white/60 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
                          : "bg-white/70 border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--cyan)]/10"
                        : "bg-transparent border-transparent text-[color:var(--muted)] cursor-not-allowed"
                  }`}
                  style={
                    booked && accentColor
                      ? {
                          backgroundColor: rgbaFromHex(accentColor, 0.15),
                          borderColor: rgbaFromHex(accentColor, 0.35),
                        }
                      : undefined
                  }
                  disabled={!clickable}
                >
                  <div className="flex flex-col h-full px-2 py-2">
                    {isToday ? (
                      <span
                        aria-label="Hoy"
                        title="Hoy"
                        className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[color:var(--cyan)]"
                      />
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">
                        {date.getDate()}
                      </span>
                      {booked && accentColor ? (
                        <span
                          style={{
                            backgroundColor: accentColor,
                            width: 8,
                            height: 8,
                            borderRadius: 9999,
                            flex: "0 0 auto",
                          }}
                        />
                      ) : null}
                    </div>

                    <div
                      className="mt-1 text-[10px] font-semibold leading-tight overflow-hidden"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                      }}
                    >
                      {booked ? booked.aula : allowed ? bookingDayText(date) : "—"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="w-full md:w-[360px] shrink-0">
          <div className="card p-4 md:p-5 bg-white/70">
            <h3 className="font-headings text-lg text-[color:var(--brown)]">
              {selectedDate ? formatSpanishWeekday(selectedDate) : "—"}
            </h3>
            <p className="text-sm text-[color:var(--muted)] mt-1">
              {selectedDate ? formatSpanishDate(selectedDate) : "Selecciona una fecha"}
            </p>

            <div className="mt-4">
              {!selected ? (
                <p className="text-sm text-[color:var(--muted)]">
                  No hay reserva para esta fecha.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        selected.status === "pendiente"
                          ? "bg-[color:var(--yellow)]/15 text-[color:var(--yellow)] border border-[color:var(--yellow)]/30"
                          : selected.status === "confirmada"
                            ? "bg-[color:var(--cyan)]/15 text-[color:var(--cyan)] border border-[color:var(--cyan)]/30"
                            : "bg-[color:var(--muted)]/15 text-[color:var(--muted)] border border-[color:var(--border)]"
                      }`}
                    >
                      {selected.status === "pendiente"
                        ? "Pendiente"
                        : selected.status === "confirmada"
                          ? "Confirmada"
                          : "Cancelada"}
                    </span>
                    <span className="text-sm font-semibold text-[color:var(--navy)]">
                      13:00–14:30h
                    </span>
                  </div>

                  <div className="rounded-lg border border-[color:var(--border)] bg-white/70 px-3 py-3">
                    <p className="text-xs text-[color:var(--muted)]">Nombre</p>
                    <p className="text-sm font-semibold">
                      {selected.nombre}
                    </p>

                    <div className="mt-3">
                      <p className="text-xs text-[color:var(--muted)]">Aula</p>
                      <p className="text-sm font-semibold">
                        {selected.aula}
                      </p>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-[color:var(--muted)]">
                        Alumnos
                      </p>
                      <p className="text-sm font-semibold">
                        {selected.num_alumnos}
                      </p>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-[color:var(--muted)]">Idea</p>
                      <p className="text-sm leading-relaxed">{selected.idea}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => patch(selected, "confirmada")}
                      disabled={selected.status === "confirmada"}
                      className="flex-1 h-10 rounded-lg bg-[color:var(--cyan)]/15 border border-[color:var(--cyan)]/30 text-[color:var(--navy)] font-semibold hover:bg-[color:var(--cyan)]/20 disabled:opacity-60"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => patch(selected, "cancelada")}
                      disabled={selected.status === "cancelada"}
                      className="flex-1 h-10 rounded-lg bg-white/70 border border-[color:var(--border)] text-[color:var(--muted)] font-semibold hover:bg-white disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

