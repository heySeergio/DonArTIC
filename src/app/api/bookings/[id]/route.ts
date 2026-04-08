import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  isValidBookingId,
  repoGetBookingMinimalById,
  repoUpdateBookingStatus,
} from "@/lib/bookings-repo";
import { isFutureDate, parseISODate } from "@/lib/dates";

/** Contraseña de admin fija (no depende de variables de entorno). */
const ADMIN_PASSWORD = "EFFA26";

const DB_MISSING =
  "La base de datos no está configurada. Añade DATABASE_URL en Vercel (entorno del servidor).";

function getIsAdmin(request: Request) {
  const provided =
    request.headers.get("x-admin-password")?.trim() ?? "";
  return !!provided && provided === ADMIN_PASSWORD;
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

  const { status } = body as { status?: string };
  const allowed = ["pendiente", "confirmada", "cancelada"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json(
      { error: "Status inválido." },
      { status: 400 }
    );
  }

  const isAdmin = getIsAdmin(request);
  if (!isAdmin && status !== "cancelada") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
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
