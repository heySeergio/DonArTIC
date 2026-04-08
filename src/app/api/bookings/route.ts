import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  repoGetBookingByFecha,
  repoGetBookingIdByFecha,
  repoInsertBooking,
  repoListAllBookings,
  repoListBookingsByAula,
  repoListBookingsByAulaAndNombre,
} from "@/lib/bookings-repo";
import {
  isBookingDay,
  isFutureDate,
  isWorkshopAllowedISO,
  parseISODate,
  toISODate,
} from "@/lib/dates";

/** Contraseña de admin fija (no depende de variables de entorno). */
const ADMIN_PASSWORD = "EFFA26";

const DB_MISSING =
  "La base de datos no está configurada. Añade DATABASE_URL en Vercel (entorno del servidor).";

function requireAdmin(request: Request) {
  const provided =
    request.headers.get("x-admin-password")?.trim() ?? "";
  if (!provided || provided !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const sql = getSql();
  if (!sql) {
    const url = new URL(request.url);
    const fecha = url.searchParams.get("fecha");
    const aula = url.searchParams.get("aula");
    const nombre = url.searchParams.get("nombre");

    if (fecha) return NextResponse.json(null, { status: 200 });
    if (aula || nombre) return NextResponse.json([], { status: 200 });
    return NextResponse.json([], { status: 200 });
  }

  const url = new URL(request.url);
  const fecha = url.searchParams.get("fecha");
  const aula = url.searchParams.get("aula");
  const nombre = url.searchParams.get("nombre");

  try {
    // Admin: GET sin parámetros
    if (!fecha && !aula && !nombre) {
      const adminError = requireAdmin(request);
      if (adminError) return adminError;

      const data = await repoListAllBookings(sql);
      return NextResponse.json(data ?? []);
    }

    // Disponibilidad: GET ?fecha=YYYY-MM-DD
    if (fecha) {
      const parsed = parseISODate(fecha);
      if (!parsed) {
        return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
      }

      const data = await repoGetBookingByFecha(sql, toISODate(parsed));
      return NextResponse.json(data ?? null);
    }

    // Usuario: GET ?aula=X&nombre=Y
    if (aula && nombre) {
      const data = await repoListBookingsByAulaAndNombre(sql, aula, nombre);
      return NextResponse.json(data ?? []);
    }

    // Aula: GET ?aula=X (muestra todas las reservas del aula)
    if (aula && !nombre) {
      const data = await repoListBookingsByAula(sql, aula);
      return NextResponse.json(data ?? []);
    }

    return NextResponse.json(
      {
        error:
          "Parámetros no válidos. Usa ?fecha=YYYY-MM-DD, ?aula=X[&nombre=Y], o GET sin parámetros (admin).",
      },
      { status: 400 }
    );
  } catch (e) {
    console.error("[bookings GET]", e);
    return NextResponse.json(
      { error: "Error al consultar la base de datos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: DB_MISSING }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { fecha, aula, nombre, idea, num_alumnos } = body as {
    fecha?: string;
    aula?: string;
    nombre?: string;
    idea?: string;
    num_alumnos?: number;
  };

  if (!fecha || !aula || !nombre || !idea || typeof num_alumnos !== "number") {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const parsedDate = parseISODate(fecha);
  if (!parsedDate) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  if (!isBookingDay(parsedDate)) {
    return NextResponse.json(
      { error: "Solo se reservan talleres los lunes, miércoles y viernes." },
      { status: 400 }
    );
  }

  if (!isFutureDate(parsedDate)) {
    return NextResponse.json(
      { error: "La fecha debe ser futura." },
      { status: 400 }
    );
  }

  const normalizedFecha = toISODate(parsedDate);

  if (!isWorkshopAllowedISO(normalizedFecha)) {
    return NextResponse.json(
      { error: "Esa fecha no está disponible en el calendario laboral." },
      { status: 400 }
    );
  }

  try {
    const existing = await repoGetBookingIdByFecha(sql, normalizedFecha);
    if (existing?.id) {
      return NextResponse.json(
        { error: "Esta fecha ya está reservada." },
        { status: 409 }
      );
    }

    const result = await repoInsertBooking(sql, {
      fecha: normalizedFecha,
      aula,
      nombre,
      idea,
      num_alumnos,
    });

    if (!result.ok) {
      if (result.uniqueViolation) {
        return NextResponse.json({ error: result.message }, { status: 409 });
      }
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json(result.booking, { status: 201 });
  } catch (e: unknown) {
    console.error("[bookings POST]", e);
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "42P01"
    ) {
      return NextResponse.json(
        {
          error:
            "La tabla de reservas no existe en Neon. Ejecuta db/schema.sql en el SQL Editor de Neon o, con DATABASE_URL local: npm run db:setup",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Error al guardar la reserva." },
      { status: 500 }
    );
  }
}
