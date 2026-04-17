"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  aula: z.string().min(1, "Selecciona un aula."),
  nombre: z
    .string()
    .min(3, "Introduce tu nombre completo.")
    .transform((v) => v.trim()),
});

export type OnboardingData = z.infer<typeof schema>;

const aulaOptions: string[] = [
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
  "AGRARIA",
  // Según indicación del usuario: NO incluir “ALMACÉN”.
  "CONFECCIÓN",
  "EFFA",
  "INFANTIL",
  "MÚSICA",
  "RELIGIÓN",
  "TVA 1",
  "TVA 2",
  "TVA 3",
  "TVA 4",
  "TVA 5",
];

export default function OnboardingForm({
  onContinue,
}: {
  onContinue: (data: OnboardingData) => void;
}) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingData>({
    resolver: zodResolver(schema),
    defaultValues: { aula: "", nombre: "" },
  });

  const submit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      onContinue(values);
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[color:var(--text)]">
          ¿A qué aula perteneces?
        </label>
        <select
          {...register("aula")}
          className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {aulaOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {errors.aula?.message && (
          <p className="text-xs text-[color:var(--magenta)]">
            {errors.aula.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[color:var(--text)]">
          Tu nombre completo
        </label>
        <input
          {...register("nombre")}
          placeholder="Ej. María López"
          className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
        />
        {errors.nombre?.message && (
          <p className="text-xs text-[color:var(--magenta)]">
            {errors.nombre.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 h-12 rounded-lg bg-[color:var(--brown)] text-white font-semibold hover:opacity-95 disabled:opacity-60"
      >
        {loading ? "Continuando…" : "Continuar →"}
      </button>
    </form>
  );
}

