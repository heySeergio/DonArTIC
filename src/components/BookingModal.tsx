"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  formatSpanishDate,
  formatSpanishWeekday,
  getBookingDayLabel,
  isBookingDay,
  isFutureDate,
  isWorkshopAllowedISO,
  parseISODate,
} from "@/lib/dates";
import type { Booking } from "@/lib/types";

const schema = z
  .object({
    aula_destino: z.enum(["TU_AULA", "CLASE", "EFFA", "OTRA"]),
    aula_clase: z.string().optional(),
    aula_otro: z.string().optional(),
    idea: z.string().min(1, "La idea es obligatoria."),
    num_alumnos: z
      .number()
      .int()
      .min(1, "Mínimo 1 alumno.")
      .max(30, "Máximo 30 alumnos."),
  })
  .superRefine((values, ctx) => {
    if (values.aula_destino === "CLASE") {
      const v = values.aula_clase?.trim() ?? "";
      if (!v) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona la clase donde se hará el taller.",
          path: ["aula_clase"],
        });
      }
    }
    if (values.aula_destino === "OTRA") {
      const v = values.aula_otro?.trim() ?? "";
      if (!v) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Introduce el nombre de la otra aula.",
          path: ["aula_otro"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const classDestinationOptions: string[] = [
  "1ºA",
  "1ºB",
  "2ºA",
  "2ºB",
  "2ºC",
  "2ºD",
  "2ºE",
  "2ºF",
  "AL 1",
  "AL 2",
  "AL 3",
  "AL 4",
  "CONFECCIÓN",
  "EFFA",
  "INFANTIL",
  "MÚSICA",
  "TVA 1",
  "TVA 2",
  "TVA 3",
  "TVA 4",
  "TVA 5",
];

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7.7 13.1 4.7 10.1 3.6 11.2 7.7 15.3 16.4 6.6 15.3 5.5 7.7 13.1Z"
        fill="#4A7C3F"
      />
    </svg>
  );
}

export default function BookingModal({
  open,
  selectedFecha,
  profile,
  onClose,
  onBooked,
  cooldownUntilISO,
}: {
  open: boolean;
  selectedFecha: string | null;
  profile: { aula: string; nombre: string };
  onClose: () => void;
  onBooked: (booking: Booking) => void;
  cooldownUntilISO: string | null;
}) {
  const isReligionProfile =
    profile.aula
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase() === "RELIGION";

  const parsed = useMemo(() => {
    if (!selectedFecha) return null;
    return parseISODate(selectedFecha);
  }, [selectedFecha]);

  const [toast, setToast] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      aula_destino: isReligionProfile ? "CLASE" : "TU_AULA",
      aula_clase: "",
      aula_otro: "",
      idea: "",
      num_alumnos: 5,
    },
  });

  const aulaDestino = watch("aula_destino");
  const aulaClase = watch("aula_clase");
  const aulaOtro = watch("aula_otro");
  const aulaSeleccionada =
    aulaDestino === "CLASE"
      ? aulaClase?.trim() || ""
      : aulaDestino === "EFFA"
      ? "EFFA"
      : aulaDestino === "OTRA"
        ? aulaOtro?.trim() || ""
        : profile.aula;

  useEffect(() => {
    setToast(null);
    setSuccessBooking(null);
    setConfirmStep(false);
    setPendingValues(null);
    if (!open) return;
    reset({
      aula_destino: isReligionProfile ? "CLASE" : "TU_AULA",
      aula_clase: "",
      aula_otro: "",
      idea: "",
      num_alumnos: 5,
    });
  }, [open, selectedFecha, reset, isReligionProfile]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const submit = handleSubmit(async (values) => {
    if (!selectedFecha) return;

    if (!parsed || !isBookingDay(parsed) || !isFutureDate(parsed)) {
      setToast("Selecciona una fecha válida y futura (L/X/V).");
      return;
    }

    if (!isWorkshopAllowedISO(selectedFecha)) {
      setToast("Esa fecha no está disponible en el calendario laboral.");
      return;
    }

    if (cooldownUntilISO && selectedFecha < cooldownUntilISO) {
      const nextAvailable = parseISODate(cooldownUntilISO);
      setToast(
        nextAvailable
          ? `No puedes reservar hasta pasadas dos semanas. Disponible desde ${formatSpanishDate(
              nextAvailable
            )}.`
          : "No puedes reservar hasta pasadas dos semanas."
      );
      return;
    }

    // Paso extra: confirmación explícita.
    setPendingValues(values);
    setConfirmStep(true);
  });

  const confirm = async () => {
    if (!selectedFecha || !pendingValues) return;
    setSubmitting(true);
    setToast(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: selectedFecha,
          aula:
            pendingValues.aula_destino === "CLASE"
              ? (pendingValues.aula_clase ?? "").trim()
              : pendingValues.aula_destino === "EFFA"
              ? "EFFA"
              : pendingValues.aula_destino === "OTRA"
                ? (pendingValues.aula_otro ?? "").trim()
                : profile.aula,
          nombre: profile.nombre,
          idea: pendingValues.idea,
          num_alumnos: pendingValues.num_alumnos,
        }),
      });

      if (res.status === 409) {
        setToast("Esta fecha ya está reservada. Elige otra.");
        return;
      }

      if (!res.ok) {
        const maybe = await res.json().catch(() => null);
        setToast(maybe?.error || "No se pudo confirmar la reserva.");
        return;
      }

      const booking = (await res.json()) as Booking;
      setSuccessBooking(booking);
      onBooked(booking);
      setConfirmStep(false);
      setPendingValues(null);
    } finally {
      setSubmitting(false);
    }
  };

  const title = useMemo(() => {
    if (!parsed) return "Taller";
    const weekday = getBookingDayLabel(parsed);
    return `Taller del ${weekday}, ${formatSpanishDate(parsed)}`;
  }, [parsed]);

  return (
    <AnimatePresence>
      {open && selectedFecha && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden overscroll-y-contain"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="relative flex min-h-full w-full items-center justify-center px-3 py-6 pb-10 sm:py-8">
            <div
              className="absolute inset-0 min-h-full w-full bg-black/10 backdrop-blur-[1px]"
              aria-hidden
              onMouseDown={(e) => {
                e.preventDefault();
                onClose();
              }}
            />

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="relative z-10 w-full max-w-[520px] card p-5 md:p-7"
              onMouseDown={(e) => e.stopPropagation()}
            >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headings text-xl text-[color:var(--brown)]">
                  {title}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[color:var(--cyan)]/15 text-[color:var(--navy)] px-3 py-1 text-sm font-semibold">
                    13:00 – 14:30h
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-white/70 px-3 py-1 text-sm">
                    {aulaSeleccionada || "—"}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-white/70 px-3 py-1 text-sm">
                    {profile.nombre}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-sm text-[color:var(--muted)] hover:text-[color:var(--text)]"
              >
                Cerrar
              </button>
            </div>

            {!successBooking ? (
              <>
                {!confirmStep ? (
                  <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-[color:var(--text)]">
                        {isReligionProfile
                          ? "¿En qué clase se hará el taller?"
                          : "¿Dónde se hará el taller?"}
                      </label>
                      {isReligionProfile ? (
                        <>
                          <input type="hidden" {...register("aula_destino")} value="CLASE" />
                          <select
                            {...register("aula_clase")}
                            className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                          >
                            <option value="" disabled>
                              Selecciona una clase…
                            </option>
                            {classDestinationOptions.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <select
                          {...register("aula_destino")}
                          className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                        >
                          <option value="TU_AULA">
                            En tu aula ({profile.aula})
                          </option>
                          <option value="EFFA">En el aula EFFA</option>
                          <option value="OTRA">Otra (escribe el aula)</option>
                        </select>
                      )}
                      {errors.aula_clase?.message && isReligionProfile && (
                        <p className="text-xs text-[color:var(--magenta)]">
                          {errors.aula_clase.message}
                        </p>
                      )}
                      {aulaDestino === "OTRA" && !isReligionProfile && (
                        <input
                          {...register("aula_otro")}
                          placeholder="Ej. Salón de actos"
                          className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                        />
                      )}
                      {errors.aula_otro?.message && aulaDestino === "OTRA" && (
                        <p className="text-xs text-[color:var(--magenta)]">
                          {errors.aula_otro.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-[color:var(--text)]">
                        ¿Qué idea tienes para el taller?
                      </label>
                      <textarea
                        {...register("idea")}
                        rows={3}
                        placeholder="Describe brevemente tu propuesta…"
                        className="min-h-[96px] rounded-lg border border-[color:var(--border)] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                      />
                      {errors.idea?.message && (
                        <p className="text-xs text-[color:var(--magenta)]">
                          {errors.idea.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-[color:var(--text)]">
                        Número de alumnos
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        {...register("num_alumnos", { valueAsNumber: true })}
                        className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                      />
                      {errors.num_alumnos?.message && (
                        <p className="text-xs text-[color:var(--magenta)]">
                          {errors.num_alumnos.message}
                        </p>
                      )}
                    </div>

                    {toast && (
                      <div className="rounded-lg border border-[color:var(--magenta)]/30 bg-[color:var(--magenta)]/10 px-3 py-2 text-sm text-[color:var(--magenta)]">
                        {toast}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 h-12 rounded-lg bg-[color:var(--brown)] text-white font-semibold hover:opacity-95 disabled:opacity-60"
                      >
                        {submitting ? "Confirmando…" : "Confirmar reserva"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmStep(false);
                          onClose();
                        }}
                        className="h-12 px-4 rounded-lg border border-[color:var(--border)] bg-white/70 text-[color:var(--muted)] font-semibold hover:bg-white"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-5 flex flex-col gap-4">
                    {toast && (
                      <div className="rounded-lg border border-[color:var(--magenta)]/30 bg-[color:var(--magenta)]/10 px-3 py-2 text-sm text-[color:var(--magenta)]">
                        {toast}
                      </div>
                    )}

                    <div className="rounded-xl border border-[color:var(--border)] bg-white/70 px-4 py-4">
                      <p className="font-headings text-lg text-[color:var(--brown)]">
                        ¿Confirmar fecha?
                      </p>
                      <p className="text-sm text-[color:var(--muted)] mt-2 leading-relaxed">
                        Una vez confirmada tu reserva, no podrás reservar de nuevo
                        hasta pasadas dos semanas.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={confirm}
                        disabled={submitting}
                        className="flex-1 h-12 rounded-lg bg-[color:var(--brown)] text-white font-semibold hover:opacity-95 disabled:opacity-60"
                      >
                        {submitting ? "Confirmando…" : "Sí, confirmar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmStep(false);
                          setPendingValues(null);
                        }}
                        className="h-12 px-4 rounded-lg border border-[color:var(--border)] bg-white/70 text-[color:var(--muted)] font-semibold hover:bg-white"
                      >
                        Volver
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-[color:var(--green)]/30 bg-[color:var(--green)]/10 px-4 py-3">
                  <CheckIcon />
                  <div>
                    <p className="font-semibold text-[color:var(--green)]">
                      Reserva creada
                    </p>
                    <p className="text-sm text-[color:var(--muted)]">
                      {successBooking.status === "pendiente"
                        ? "Queda pendiente de confirmación."
                        : successBooking.status === "confirmada"
                          ? "Tu reserva está confirmada."
                          : "Tu reserva ha sido cancelada."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[color:var(--border)] bg-white/70 px-4 py-3">
                    <p className="text-xs text-[color:var(--muted)]">
                      Día / Fecha
                    </p>
                    <p className="font-semibold text-[color:var(--text)]">
                      {parsed ? formatSpanishWeekday(parsed) : ""}
                      {parsed ? " · " : ""}
                      {parsed ? formatSpanishDate(parsed) : ""}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[color:var(--border)] bg-white/70 px-4 py-3">
                    <p className="text-xs text-[color:var(--muted)]">Aula</p>
                    <p className="font-semibold text-[color:var(--text)]">
                      {successBooking.aula}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-[color:var(--muted)] leading-relaxed">
                    <span className="font-semibold text-[color:var(--text)]">
                      Idea:
                    </span>{" "}
                    {successBooking.idea}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSuccessBooking(null);
                    onClose();
                  }}
                  className="text-sm font-semibold text-[color:var(--navy)] hover:underline self-start"
                >
                    Hacer otra reserva →
                  </button>
              </div>
            )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

