"use client";

import type { Booking } from "@/lib/types";
import {
  formatBookingTimeRange,
  formatSpanishDate,
  formatSpanishWeekday,
  parseISODate,
} from "@/lib/dates";

function statusAccent(status: Booking["status"]) {
  switch (status) {
    case "pendiente":
      return { border: "var(--yellow)", badgeBg: "var(--yellow)" };
    case "confirmada":
      return { border: "var(--cyan)", badgeBg: "var(--cyan)" };
    case "cancelada":
      return { border: "var(--muted)", badgeBg: "var(--muted)" };
  }
}

export default function BookingCard({
  booking,
  canCancel,
  onCancel,
  canDelete,
  onDelete,
}: {
  booking: Booking;
  canCancel: boolean;
  onCancel: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const d = parseISODate(booking.fecha);
  const accent = statusAccent(booking.status);

  const badgeText =
    booking.status === "pendiente"
      ? "Pendiente"
      : booking.status === "confirmada"
        ? "Confirmada"
        : "Cancelada";

  return (
    <div className="card px-4 py-4">
      <div
        className="flex gap-4"
        style={{ borderLeft: `4px solid ${accent.border}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-[color:var(--muted)]">
                {d ? `${formatSpanishWeekday(d)} · ${formatSpanishDate(d)}` : ""}
              </div>
              <div className="font-semibold mt-1 text-[color:var(--text)]">
                {formatBookingTimeRange(booking.hora_inicio, booking.hora_fin)}
              </div>
            </div>

            <div className="shrink-0">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: accent.badgeBg }}
              >
                {badgeText}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xs text-[color:var(--muted)] mb-1">Idea del taller</div>
            <div
              className="text-sm text-[color:var(--text)] overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {booking.idea}
            </div>
          </div>
        </div>

        {canDelete ? (
          <div className="shrink-0 self-start">
            <button
              type="button"
              onClick={onDelete}
              className="h-10 px-3 rounded-lg border border-red-700/40 bg-red-600 text-white font-semibold hover:bg-red-700"
            >
              Eliminar reserva
            </button>
          </div>
        ) : canCancel ? (
          <div className="shrink-0 self-start">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 px-3 rounded-lg border border-[color:var(--border)] bg-white/70 text-[color:var(--muted)] font-semibold hover:bg-white"
            >
              Cancelar reserva
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

