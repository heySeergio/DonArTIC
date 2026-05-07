"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import type { Booking } from "@/lib/types";

const schema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria."),
  aula: z.string().trim().min(1, "La clase es obligatoria."),
  nombre: z.string().trim().min(1, "El nombre del profe es obligatorio."),
  idea: z.string().trim().min(1, "La idea es obligatoria."),
  num_alumnos: z
    .number()
    .int()
    .min(1, "Mínimo 1 alumno.")
    .max(30, "Máximo 30 alumnos."),
});

type FormValues = z.infer<typeof schema>;

export default function AdminCreateBookingModal({
  open,
  adminPassword,
  onClose,
  onCreated,
}: {
  open: boolean;
  adminPassword: string;
  onClose: () => void;
  onCreated: (booking: Booking) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha: "",
      aula: "",
      nombre: "",
      idea: "",
      num_alumnos: 5,
    },
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset({
      fecha: "",
      aula: "",
      nombre: "",
      idea: "",
      num_alumnos: 5,
    });
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          ...values,
          asAdmin: true,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "No se pudo crear la reserva.");
        return;
      }

      const booking = (await res.json()) as Booking;
      onCreated(booking);
      onClose();
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="relative flex min-h-full w-full items-center justify-center px-3 py-6">
            <button
              type="button"
              className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
              aria-label="Cerrar"
              onClick={onClose}
            />

            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-[560px] card p-5 md:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-headings text-xl text-[color:var(--brown)]">
                  Nueva reserva (admin)
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-[color:var(--muted)] hover:text-[color:var(--text)]"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Fecha</label>
                    <input
                      type="date"
                      {...register("fecha")}
                      className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                    />
                    {errors.fecha?.message ? (
                      <p className="text-xs text-[color:var(--magenta)]">
                        {errors.fecha.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">N.º de alumnos</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      {...register("num_alumnos", { valueAsNumber: true })}
                      className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                    />
                    {errors.num_alumnos?.message ? (
                      <p className="text-xs text-[color:var(--magenta)]">
                        {errors.num_alumnos.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Clase</label>
                  <input
                    type="text"
                    placeholder="Ej. 2ºA"
                    {...register("aula")}
                    className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                  />
                  {errors.aula?.message ? (
                    <p className="text-xs text-[color:var(--magenta)]">
                      {errors.aula.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Profe (nombre docente)</label>
                  <input
                    type="text"
                    placeholder="Nombre y apellidos"
                    {...register("nombre")}
                    className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                  />
                  {errors.nombre?.message ? (
                    <p className="text-xs text-[color:var(--magenta)]">
                      {errors.nombre.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Idea del taller</label>
                  <textarea
                    rows={4}
                    placeholder="Describe brevemente la propuesta"
                    {...register("idea")}
                    className="min-h-[108px] rounded-lg border border-[color:var(--border)] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                  />
                  {errors.idea?.message ? (
                    <p className="text-xs text-[color:var(--magenta)]">
                      {errors.idea.message}
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <div className="rounded-lg border border-[color:var(--magenta)]/30 bg-[color:var(--magenta)]/10 px-3 py-2 text-sm text-[color:var(--magenta)]">
                    {error}
                  </div>
                ) : null}

                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-12 rounded-lg bg-[color:var(--brown)] text-white font-semibold hover:opacity-95 disabled:opacity-60"
                  >
                    {submitting ? "Creando..." : "Crear reserva"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-12 px-4 rounded-lg border border-[color:var(--border)] bg-white/70 text-[color:var(--muted)] font-semibold hover:bg-white"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
