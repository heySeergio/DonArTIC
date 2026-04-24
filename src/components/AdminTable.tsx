"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Booking, BookingStatus } from "@/lib/types";
import {
  DEFAULT_BOOKING_END_TIME,
  DEFAULT_BOOKING_START_TIME,
  formatBookingTimeRange,
  formatSpanishDateLong,
  parseBookingFecha,
} from "@/lib/dates";

function statusColors(status: BookingStatus) {
  switch (status) {
    case "pendiente":
      return {
        dot: "var(--yellow)",
        bg: "rgba(255, 215, 0, 0.15)",
        fg: "var(--yellow)",
      };
    case "confirmada":
      return {
        dot: "var(--cyan)",
        bg: "rgba(0, 212, 232, 0.15)",
        fg: "var(--cyan)",
      };
    case "cancelada":
      return {
        dot: "var(--muted)",
        bg: "rgba(122, 122, 114, 0.15)",
        fg: "var(--muted)",
      };
  }
}

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "pendiente":
      return "Pendiente";
    case "confirmada":
      return "Confirmada";
    case "cancelada":
      return "Cancelada";
  }
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-[color:var(--border)]/80 py-3 last:border-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
        {label}
      </p>
      <div className="mt-1 text-sm text-[color:var(--text)]">{children}</div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 20H8L18.2 9.8C18.6 9.4 18.6 8.8 18.2 8.4L15.6 5.8C15.2 5.4 14.6 5.4 14.2 5.8L4 16V20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5L17.5 10.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function AdminTable({
  adminPassword,
  refreshKey,
  onNeedRefresh,
}: {
  adminPassword: string;
  refreshKey: number;
  onNeedRefresh: () => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | BookingStatus>("all");
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    fecha: "",
    aula: "",
    num_alumnos: 1,
    hora_inicio: DEFAULT_BOOKING_START_TIME,
    hora_fin: DEFAULT_BOOKING_END_TIME,
  });

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

  useEffect(() => {
    if (!detailBooking) {
      setEditMode(false);
      setEditError(null);
      setSavingEdit(false);
    }
  }, [detailBooking]);

  const filtered = useMemo(() => {
    const byStatus =
      filterStatus === "all"
        ? bookings
        : bookings.filter((b) => b.status === filterStatus);
    return byStatus.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [bookings, filterStatus]);

  const onPatch = async (id: string, status: BookingStatus) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    onNeedRefresh();
    setDetailBooking((cur) => (cur?.id === id ? { ...cur, status } : cur));
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": adminPassword },
    });
    if (!res.ok) return;
    onNeedRefresh();
    setDetailBooking((cur) => (cur?.id === id ? null : cur));
  };

  const startEdit = (booking: Booking) => {
    setEditMode(true);
    setEditError(null);
    setEditValues({
      fecha: booking.fecha.slice(0, 10),
      aula: booking.aula,
      num_alumnos: booking.num_alumnos,
      hora_inicio: booking.hora_inicio ?? DEFAULT_BOOKING_START_TIME,
      hora_fin: booking.hora_fin ?? DEFAULT_BOOKING_END_TIME,
    });
  };

  const saveEdit = async () => {
    if (!detailBooking) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/bookings/${detailBooking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          fecha: editValues.fecha,
          aula: editValues.aula,
          num_alumnos: Number(editValues.num_alumnos),
          hora_inicio: editValues.hora_inicio,
          hora_fin: editValues.hora_fin,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setEditError(data?.error ?? "No se pudo actualizar la reserva.");
        return;
      }

      const updated = (await res.json()) as Booking;
      setDetailBooking(updated);
      setEditMode(false);
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      onNeedRefresh();
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="w-full">
      <div className="card p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="font-headings text-lg text-[color:var(--navy)]">
              Reservas
            </h2>
            <p className="text-sm text-[color:var(--muted)] mt-1">
              Gestión completa de talleres
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-[color:var(--muted)] font-semibold">
              Filtrar:
            </div>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as "all" | BookingStatus)
              }
              className="h-10 rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm outline-none"
            >
              <option value="all">Todas</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[520px] w-full border-collapse">
            <thead>
              <tr className="text-left text-xs text-[color:var(--muted)]">
                {["Clase", "Fecha", "Nombre", "Estado", "Acciones"].map((h, i) => (
                  <th
                    key={h}
                    className={`pb-3 font-semibold ${i === 0 ? "pl-5" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <div className="inline-block h-10 w-10 rounded-full border border-[color:var(--border)] animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[color:var(--muted)]">
                    No hay reservas para este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const d = parseBookingFecha(b.fecha);
                  const colors = statusColors(b.status);
                  const fechaBonita = d ? formatSpanishDateLong(d) : b.fecha;
                  return (
                    <tr
                      key={b.id}
                      style={{ borderLeft: `3px solid ${colors.dot}` }}
                      className="border-t border-[color:var(--border)]"
                    >
                      <td className="py-4 pl-5 pr-3 text-sm font-semibold text-[color:var(--navy)]">
                        {b.aula}
                      </td>
                      <td className="py-4 pr-3 text-sm text-[color:var(--text)] leading-snug max-w-[220px]">
                        {fechaBonita}
                      </td>
                      <td className="py-4 pr-3 text-sm">{b.nombre}</td>
                      <td className="py-4 pr-3 text-sm">
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 font-semibold border"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.fg,
                            borderColor:
                              b.status === "cancelada"
                                ? "var(--border)"
                                : colors.fg,
                          }}
                        >
                          {statusLabel(b.status)}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditMode(false);
                              setEditError(null);
                              setDetailBooking(b);
                            }}
                            className="h-9 px-3 rounded-lg bg-white/70 text-[color:var(--navy)] font-semibold border border-[color:var(--border)] hover:bg-white text-sm"
                          >
                            Ver detalles
                          </button>
                          <button
                            type="button"
                            onClick={() => onPatch(b.id, "confirmada")}
                            className="h-9 px-3 rounded-lg bg-[color:var(--cyan)]/15 text-[color:var(--navy)] font-semibold border border-[color:var(--cyan)]/30 hover:bg-[color:var(--cyan)]/20 disabled:opacity-60 text-sm"
                            disabled={
                              b.status === "confirmada" ||
                              b.status === "cancelada"
                            }
                          >
                            Confirmar
                          </button>
                          {b.status === "cancelada" ? (
                            <button
                              type="button"
                              onClick={() => onDelete(b.id)}
                              className="h-9 px-3 rounded-lg bg-red-600 text-white font-semibold border border-red-700/30 hover:bg-red-700 text-sm"
                            >
                              Eliminar reserva
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onPatch(b.id, "cancelada")}
                              className="h-9 px-3 rounded-lg bg-white/70 text-[color:var(--muted)] font-semibold border border-[color:var(--border)] hover:bg-white text-sm"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {detailBooking ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
              onClick={() => setDetailBooking(null)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-detail-title"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-md card p-5 md:p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <h3
                    id="admin-detail-title"
                    className="font-headings text-lg text-[color:var(--brown)]"
                  >
                    Detalles de la reserva
                  </h3>
                  <button
                    type="button"
                    onClick={() => startEdit(detailBooking)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--brown)]/30 bg-[color:var(--brown)]/10 text-[color:var(--brown)] hover:bg-[color:var(--brown)]/15"
                    aria-label="Editar reserva"
                    title="Editar reserva"
                  >
                    <EditIcon />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailBooking(null)}
                  className="text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] shrink-0"
                >
                  Cerrar
                </button>
              </div>
              <p className="text-xs text-[color:var(--muted)] mb-4">
                Horario del taller:{" "}
                {formatBookingTimeRange(
                  detailBooking.hora_inicio,
                  detailBooking.hora_fin
                )}
              </p>

              <div className="rounded-xl border border-[color:var(--border)] bg-white/60 px-4">
                <DetailRow label="Fecha">
                  {editMode ? (
                    <input
                      type="date"
                      value={editValues.fecha}
                      onChange={(e) =>
                        setEditValues((cur) => ({ ...cur, fecha: e.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm outline-none"
                    />
                  ) : (
                    (() => {
                      const d = parseBookingFecha(detailBooking.fecha);
                      return d ? formatSpanishDateLong(d) : detailBooking.fecha;
                    })()
                  )}
                </DetailRow>
                <DetailRow label="Clase">
                  {editMode ? (
                    <input
                      type="text"
                      value={editValues.aula}
                      onChange={(e) =>
                        setEditValues((cur) => ({ ...cur, aula: e.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm outline-none"
                    />
                  ) : (
                    detailBooking.aula
                  )}
                </DetailRow>
                <DetailRow label="Nombre (docente)">{detailBooking.nombre}</DetailRow>
                <DetailRow label="N.º de alumnos">
                  {editMode ? (
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={editValues.num_alumnos}
                      onChange={(e) =>
                        setEditValues((cur) => ({
                          ...cur,
                          num_alumnos: Number(e.target.value),
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm outline-none"
                    />
                  ) : (
                    detailBooking.num_alumnos
                  )}
                </DetailRow>
                <DetailRow label="Hora (interna)">
                  {editMode ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={editValues.hora_inicio}
                        onChange={(e) =>
                          setEditValues((cur) => ({
                            ...cur,
                            hora_inicio: e.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm outline-none"
                      />
                      <input
                        type="time"
                        value={editValues.hora_fin}
                        onChange={(e) =>
                          setEditValues((cur) => ({ ...cur, hora_fin: e.target.value }))
                        }
                        className="h-10 w-full rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm outline-none"
                      />
                    </div>
                  ) : (
                    formatBookingTimeRange(
                      detailBooking.hora_inicio,
                      detailBooking.hora_fin
                    )
                  )}
                </DetailRow>
                <DetailRow label="Idea del taller">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {detailBooking.idea}
                  </p>
                </DetailRow>
                <DetailRow label="Estado">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 font-semibold border text-xs"
                    style={{
                      backgroundColor: statusColors(detailBooking.status).bg,
                      color: statusColors(detailBooking.status).fg,
                      borderColor:
                        detailBooking.status === "cancelada"
                          ? "var(--border)"
                          : statusColors(detailBooking.status).fg,
                    }}
                  >
                    {statusLabel(detailBooking.status)}
                  </span>
                </DetailRow>
              </div>

              {editError ? (
                <div className="mt-3 rounded-lg border border-[color:var(--magenta)]/30 bg-[color:var(--magenta)]/10 px-3 py-2 text-sm text-[color:var(--magenta)]">
                  {editError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 mt-5">
                {editMode ? (
                  <>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={savingEdit}
                      className="flex-1 min-w-[120px] h-11 rounded-lg bg-[color:var(--brown)] text-white font-semibold border border-[color:var(--brown)]/30 hover:opacity-95 disabled:opacity-60"
                    >
                      {savingEdit ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditMode(false);
                        setEditError(null);
                      }}
                      className="flex-1 min-w-[120px] h-11 rounded-lg bg-white/70 text-[color:var(--muted)] font-semibold border border-[color:var(--border)] hover:bg-white"
                    >
                      Cancelar edición
                    </button>
                  </>
                ) : null}

                {!editMode &&
                  (detailBooking.status === "cancelada" ? (
                    <button
                      type="button"
                      onClick={() => onDelete(detailBooking.id)}
                      className="flex-1 min-w-[120px] h-11 rounded-lg bg-red-600 text-white font-semibold border border-red-700/30 hover:bg-red-700"
                    >
                      Eliminar reserva
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onPatch(detailBooking.id, "confirmada")}
                        className="flex-1 min-w-[120px] h-11 rounded-lg bg-[color:var(--cyan)]/15 text-[color:var(--navy)] font-semibold border border-[color:var(--cyan)]/30 hover:bg-[color:var(--cyan)]/20 disabled:opacity-50"
                        disabled={detailBooking.status === "confirmada"}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => onPatch(detailBooking.id, "cancelada")}
                        className="flex-1 min-w-[120px] h-11 rounded-lg bg-white/70 text-[color:var(--muted)] font-semibold border border-[color:var(--border)] hover:bg-white"
                      >
                        Cancelar reserva
                      </button>
                    </>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
