import type { Booking } from "@/lib/types";
import type { NeonSql } from "@/lib/db";

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "23505"
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidBookingId(id: string): boolean {
  return UUID_RE.test(id);
}

export async function repoListAllBookings(sql: NeonSql): Promise<Booking[]> {
  const rows = await sql`
    SELECT
      id,
      created_at,
      fecha::text AS fecha,
      aula,
      nombre,
      idea,
      num_alumnos,
      status
    FROM bookings
    ORDER BY fecha ASC
  `;
  return rows as unknown as Booking[];
}

/** Reserva que bloquea el día en el calendario público (pendiente o confirmada). */
export async function repoGetActiveBookingByFecha(
  sql: NeonSql,
  fechaISO: string
): Promise<Booking | null> {
  const rows = await sql`
    SELECT
      id,
      created_at,
      fecha::text AS fecha,
      aula,
      nombre,
      idea,
      num_alumnos,
      status
    FROM bookings
    WHERE fecha = ${fechaISO}::date
      AND status IN ('pendiente', 'confirmada')
    LIMIT 1
  `;
  const list = rows as unknown as Booking[];
  return list[0] ?? null;
}

/** @deprecated usar repoGetActiveBookingByFecha para disponibilidad */
export async function repoGetBookingByFecha(
  sql: NeonSql,
  fechaISO: string
): Promise<Booking | null> {
  return repoGetActiveBookingByFecha(sql, fechaISO);
}

export async function repoListBookingsByAulaAndNombre(
  sql: NeonSql,
  aula: string,
  nombre: string
): Promise<Booking[]> {
  const rows = await sql`
    SELECT
      id,
      created_at,
      fecha::text AS fecha,
      aula,
      nombre,
      idea,
      num_alumnos,
      status
    FROM bookings
    WHERE aula = ${aula} AND nombre = ${nombre}
    ORDER BY fecha ASC
  `;
  return rows as unknown as Booking[];
}

export async function repoListBookingsByAula(
  sql: NeonSql,
  aula: string
): Promise<Booking[]> {
  const rows = await sql`
    SELECT
      id,
      created_at,
      fecha::text AS fecha,
      aula,
      nombre,
      idea,
      num_alumnos,
      status
    FROM bookings
    WHERE aula = ${aula}
    ORDER BY fecha ASC
  `;
  return rows as unknown as Booking[];
}

export async function repoGetActiveBookingIdByFecha(
  sql: NeonSql,
  fechaISO: string
): Promise<{ id: string } | null> {
  const rows = await sql`
    SELECT id FROM bookings
    WHERE fecha = ${fechaISO}::date
      AND status IN ('pendiente', 'confirmada')
    LIMIT 1
  `;
  const list = rows as unknown as { id: string }[];
  return list[0] ?? null;
}

export async function repoGetActiveBookingIdByFechaExcludingId(
  sql: NeonSql,
  fechaISO: string,
  excludedId: string
): Promise<{ id: string } | null> {
  const rows = await sql`
    SELECT id FROM bookings
    WHERE fecha = ${fechaISO}::date
      AND status IN ('pendiente', 'confirmada')
      AND id <> ${excludedId}::uuid
    LIMIT 1
  `;
  const list = rows as unknown as { id: string }[];
  return list[0] ?? null;
}

export async function repoInsertBooking(
  sql: NeonSql,
  row: {
    fecha: string;
    aula: string;
    nombre: string;
    idea: string;
    num_alumnos: number;
    hora_inicio?: string;
    hora_fin?: string;
  }
): Promise<{ ok: true; booking: Booking } | { ok: false; uniqueViolation: boolean; message: string }> {
  try {
    const rows = await sql`
      INSERT INTO bookings (fecha, aula, nombre, idea, num_alumnos)
      VALUES (
        ${row.fecha}::date,
        ${row.aula},
        ${row.nombre},
        ${row.idea},
        ${row.num_alumnos}
      )
      RETURNING
        id,
        created_at,
        fecha::text AS fecha,
        aula,
        nombre,
        idea,
        num_alumnos,
        status
    `;
    const list = rows as unknown as Booking[];
    const booking = list[0];
    if (!booking) {
      return { ok: false, uniqueViolation: false, message: "No se pudo crear la reserva." };
    }
    return { ok: true, booking };
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return { ok: false, uniqueViolation: true, message: "Esta fecha ya está reservada." };
    }
    const msg = e instanceof Error ? e.message : "Error al guardar la reserva.";
    return { ok: false, uniqueViolation: false, message: msg };
  }
}

export async function repoGetBookingMinimalById(
  sql: NeonSql,
  id: string
): Promise<{ id: string; fecha: string } | null> {
  const rows = await sql`
    SELECT id, fecha::text AS fecha FROM bookings WHERE id = ${id}::uuid LIMIT 1
  `;
  const list = rows as unknown as { id: string; fecha: string }[];
  return list[0] ?? null;
}

export async function repoGetBookingById(
  sql: NeonSql,
  id: string
): Promise<Booking | null> {
  const rows = await sql`
    SELECT
      id,
      created_at,
      fecha::text AS fecha,
      aula,
      nombre,
      idea,
      num_alumnos,
      status
    FROM bookings
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  const list = rows as unknown as Booking[];
  return list[0] ?? null;
}

export async function repoDeleteBooking(
  sql: NeonSql,
  id: string
): Promise<{ ok: true; booking: Booking } | { ok: false; notFound: boolean; message: string }> {
  try {
    const rows = await sql`
      DELETE FROM bookings
      WHERE id = ${id}::uuid
      RETURNING
        id,
        created_at,
        fecha::text AS fecha,
        aula,
        nombre,
        idea,
        num_alumnos,
        status
    `;
    const list = rows as unknown as Booking[];
    const booking = list[0];
    if (!booking) {
      return { ok: false, notFound: true, message: "Reserva no encontrada." };
    }
    return { ok: true, booking };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al eliminar la reserva.";
    return { ok: false, notFound: false, message: msg };
  }
}

export async function repoUpdateBookingStatus(
  sql: NeonSql,
  id: string,
  status: Booking["status"]
): Promise<{ ok: true; booking: Booking } | { ok: false; notFound: boolean; message: string }> {
  try {
    const rows = await sql`
      UPDATE bookings SET status = ${status}
      WHERE id = ${id}::uuid
      RETURNING
        id,
        created_at,
        fecha::text AS fecha,
        aula,
        nombre,
        idea,
        num_alumnos,
        status
    `;
    const list = rows as unknown as Booking[];
    const booking = list[0];
    if (!booking) {
      return { ok: false, notFound: true, message: "Reserva no encontrada." };
    }
    return { ok: true, booking };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al actualizar la reserva.";
    return { ok: false, notFound: false, message: msg };
  }
}

export async function repoUpdateBookingDetails(
  sql: NeonSql,
  id: string,
  changes: {
    fecha: string;
    aula: string;
    num_alumnos: number;
    hora_inicio: string;
    hora_fin: string;
  }
): Promise<{ ok: true; booking: Booking } | { ok: false; notFound: boolean; message: string }> {
  try {
    const rows = await sql`
      UPDATE bookings
      SET fecha = ${changes.fecha}::date,
          aula = ${changes.aula},
          num_alumnos = ${changes.num_alumnos}
      WHERE id = ${id}::uuid
      RETURNING
        id,
        created_at,
        fecha::text AS fecha,
        aula,
        nombre,
        idea,
        num_alumnos,
        status
    `;
    const list = rows as unknown as Booking[];
    const booking = list[0];
    if (!booking) {
      return { ok: false, notFound: true, message: "Reserva no encontrada." };
    }
    return { ok: true, booking };
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return { ok: false, notFound: false, message: "Esta fecha ya está reservada." };
    }
    const msg = e instanceof Error ? e.message : "Error al actualizar la reserva.";
    return { ok: false, notFound: false, message: msg };
  }
}
