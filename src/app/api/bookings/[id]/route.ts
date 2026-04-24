import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  isValidBookingId,
  repoDeleteBooking,
  repoGetActiveBookingIdByFechaExcludingId,
  repoGetBookingById,
  repoGetBookingMinimalById,
  repoUpdateBookingDetails,
  repoUpdateBookingStatus,
} from "@/lib/bookings-repo";
import {
  isBookingDay,
  isFutureDate,
  isValidTimeHHMM,
  isWorkshopAllowedISO,
  parseISODate,
  toISODate,
} from "@/lib/dates";

/** Contraseña de admin fija (no depende de variables de entorno). */
const ADMIN_PASSWORD = "EFFA26";

const DB_MISSING =
  "La base de datos no está configurada. Añade DATABASE_URL en Vercel (entorno del servidor).";

function getIsAdmin(request: Request) {
  const provided =
    request.headers.get("x-admin-password")?.trim() ?? "";
  return !!provided && provided === ADMIN_PASSWORD;
}

function sameProfile(
  aulaA: string,
  nombreA: string,
  aulaB: string,
  nombreB: string
) {
  const norm = (s: string) =>
    s
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  return norm(aulaA) === norm(aulaB) && norm(nombreA) === norm(nombreB);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: DB_MISSING }, { status: 500 });
  }

  if (!isValidBookingId(id)) {
    return NextResponse.json(
      { error: "Identificador de reserva inválido." },
      { status: 400 }
    );
  }

  try {
    if (getIsAdmin(request)) {
      const result = await repoDeleteBooking(sql, id);
      if (!result.ok) {
        if (result.notFound) {
          return NextResponse.json({ error: result.message }, { status: 404 });
        }
        return NextResponse.json({ error: result.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = (await request.json().catch(() => null)) as {
      aula?: string;
      nombre?: string;
    } | null;
    const aula = body?.aula?.trim();
    const nombre = body?.nombre?.trim();
    if (!aula || !nombre) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const booking = await repoGetBookingById(sql, id);
    if (!booking) {
      return NextResponse.json(
        { error: "Reserva no encontrada." },
        { status: 404 }
      );
    }
    if (booking.status !== "cancelada") {
      return NextResponse.json(
        {
          error:
            "Solo se puede eliminar del sistema una reserva que ya esté cancelada.",
        },
        { status: 400 }
      );
    }
    if (!sameProfile(booking.aula, booking.nombre, aula, nombre)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const result = await repoDeleteBooking(sql, id);
    if (!result.ok) {
      if (result.notFound) {
        return NextResponse.json({ error: result.message }, { status: 404 });
      }
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[bookings DELETE]", e);
    return NextResponse.json(
      { error: "Error al eliminar la reserva." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: DB_MISSING }, { status: 500 });
  }

  if (!isValidBookingId(id)) {
    return NextResponse.json({ error: "Identificador de reserva inválido." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const isAdmin = getIsAdmin(request);
  const { status, fecha, aula, num_alumnos, hora_inicio, hora_fin } = body as {
    status?: string;
    fecha?: string;
    aula?: string;
    num_alumnos?: number;
    hora_inicio?: string;
    hora_fin?: string;
  };

  const hasStatusUpdate = typeof status === "string";
  const hasDetailsUpdate =
    typeof fecha === "string" ||
    typeof aula === "string" ||
    typeof num_alumnos === "number" ||
    typeof hora_inicio === "string" ||
    typeof hora_fin === "string";

  if (!hasStatusUpdate && !hasDetailsUpdate) {
    return NextResponse.json({ error: "No hay cambios para aplicar." }, { status: 400 });
  }

  if (hasDetailsUpdate && !isAdmin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    if (hasDetailsUpdate) {
      const booking = await repoGetBookingById(sql, id);
      if (!booking) {
        return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
      }

      const nextFechaRaw = (typeof fecha === "string" ? fecha : booking.fecha).trim();
      const nextAula = (typeof aula === "string" ? aula : booking.aula).trim();
      const nextNumAlumnos =
        typeof num_alumnos === "number" ? num_alumnos : booking.num_alumnos;
      const nextHoraInicioRaw =
        (typeof hora_inicio === "string" ? hora_inicio : booking.hora_inicio ?? "13:00").trim();
      const nextHoraFinRaw =
        (typeof hora_fin === "string" ? hora_fin : booking.hora_fin ?? "14:30").trim();

      if (!nextFechaRaw || !nextAula) {
        return NextResponse.json({ error: "Fecha y clase son obligatorias." }, { status: 400 });
      }
      if (!Number.isInteger(nextNumAlumnos) || nextNumAlumnos < 1 || nextNumAlumnos > 30) {
        return NextResponse.json({ error: "Número de alumnos inválido." }, { status: 400 });
      }
      if (!isValidTimeHHMM(nextHoraInicioRaw) || !isValidTimeHHMM(nextHoraFinRaw)) {
        return NextResponse.json({ error: "Formato de hora inválido (HH:mm)." }, { status: 400 });
      }
      if (nextHoraInicioRaw >= nextHoraFinRaw) {
        return NextResponse.json(
          { error: "La hora de inicio debe ser anterior a la hora de fin." },
          { status: 400 }
        );
      }

      const parsedDate = parseISODate(nextFechaRaw);
      if (!parsedDate) {
        return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
      }
      if (!isBookingDay(parsedDate)) {
        return NextResponse.json(
          { error: "Solo se permiten lunes, martes, miércoles y viernes." },
          { status: 400 }
        );
      }
      if (!isFutureDate(parsedDate)) {
        return NextResponse.json({ error: "La fecha debe ser futura." }, { status: 400 });
      }

      const normalizedFecha = toISODate(parsedDate);
      if (!isWorkshopAllowedISO(normalizedFecha)) {
        return NextResponse.json(
          { error: "Esa fecha no está disponible en el calendario laboral." },
          { status: 400 }
        );
      }

      const occupied = await repoGetActiveBookingIdByFechaExcludingId(
        sql,
        normalizedFecha,
        id
      );
      if (occupied?.id) {
        return NextResponse.json({ error: "Esta fecha ya está reservada." }, { status: 409 });
      }

      const result = await repoUpdateBookingDetails(sql, id, {
        fecha: normalizedFecha,
        aula: nextAula,
        num_alumnos: nextNumAlumnos,
        hora_inicio: nextHoraInicioRaw,
        hora_fin: nextHoraFinRaw,
      });

      if (!result.ok) {
        if (result.notFound) {
          return NextResponse.json({ error: result.message }, { status: 404 });
        }
        return NextResponse.json({ error: result.message }, { status: 500 });
      }
      return NextResponse.json(result.booking, { status: 200 });
    }

    const allowed = ["pendiente", "confirmada", "cancelada"];
    if (!status || !allowed.includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    if (!isAdmin && status !== "cancelada") {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Cancelación pública: solo cancelamos si la fecha es futura.
    if (!isAdmin && status === "cancelada") {
      const booking = await repoGetBookingMinimalById(sql, id);

      if (!booking) {
        return NextResponse.json(
          { error: "Reserva no encontrada." },
          { status: 404 }
        );
      }

      const fechaDate = booking.fecha ? parseISODate(booking.fecha) : null;
      if (!fechaDate || !isFutureDate(fechaDate)) {
        return NextResponse.json(
          { error: "No puedes cancelar una reserva pasada." },
          { status: 400 }
        );
      }
    }

    const result = await repoUpdateBookingStatus(
      sql,
      id,
      status as "pendiente" | "confirmada" | "cancelada"
    );

    if (!result.ok) {
      if (result.notFound) {
        return NextResponse.json({ error: result.message }, { status: 404 });
      }
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json(result.booking, { status: 200 });
  } catch (e) {
    console.error("[bookings PATCH]", e);
    return NextResponse.json(
      { error: "Error al actualizar la reserva." },
      { status: 500 }
    );
  }
}
