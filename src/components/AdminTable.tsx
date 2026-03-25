"use client";

import { useEffect, useMemo, useState } from "react";
import type { Booking, BookingStatus } from "@/lib/types";
import { formatSpanishWeekday, parseISODate } from "@/lib/dates";

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
          <table className="min-w-[860px] w-full border-collapse">
            <thead>
              <tr className="text-left text-xs text-[color:var(--muted)]">
                {[
                  "Fecha",
                  "Día",
                  "Aula",
                  "Nombre",
                  "Alumnos",
                  "Idea",
                  "Estado",
                  "Acciones",
                ].map((h) => (
                  <th key={h} className="pb-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <div className="inline-block h-10 w-10 rounded-full border border-[color:var(--border)] animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[color:var(--muted)]">
                    No hay reservas para este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const d = parseISODate(b.fecha);
                  const colors = statusColors(b.status);
                  return (
                    <tr
                      key={b.id}
                      style={{ borderLeft: `3px solid ${colors.dot}` }}
                      className="border-t border-[color:var(--border)]"
                    >
                      <td className="py-4 pr-3 text-sm font-semibold">
                        {b.fecha}
                      </td>
                      <td className="py-4 pr-3 text-sm text-[color:var(--text)]">
                        {d
                          ? `${formatSpanishWeekday(d)}`
                          : ""}
                      </td>
                      <td className="py-4 pr-3 text-sm">{b.aula}</td>
                      <td className="py-4 pr-3 text-sm">{b.nombre}</td>
                      <td className="py-4 pr-3 text-sm font-semibold">
                        {b.num_alumnos}
                      </td>
                      <td className="py-4 pr-3 text-sm max-w-[240px]">
                        <div className="truncate">
                          {b.idea}
                        </div>
                      </td>
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
                          {b.status === "pendiente"
                            ? "Pendiente"
                            : b.status === "confirmada"
                              ? "Confirmada"
                              : "Cancelada"}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onPatch(b.id, "confirmada")}
                            className="h-9 px-3 rounded-lg bg-[color:var(--cyan)]/15 text-[color:var(--navy)] font-semibold border border-[color:var(--cyan)]/30 hover:bg-[color:var(--cyan)]/20 disabled:opacity-60"
                            disabled={b.status === "confirmada"}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => onPatch(b.id, "cancelada")}
                            className="h-9 px-3 rounded-lg bg-white/70 text-[color:var(--muted)] font-semibold border border-[color:var(--border)] hover:bg-white disabled:opacity-60"
                            disabled={b.status === "cancelada"}
                          >
                            Cancelar
                          </button>
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
    </div>
  );
}

