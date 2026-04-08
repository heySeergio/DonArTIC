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
  const rows = await sql`SELECT * FROM bookings ORDER BY fecha ASC`;
  return rows as unknown as Booking[];
}

export async function repoGetBookingByFecha(
  sql: NeonSql,
  fechaISO: string
): Promise<Booking | null> {
  const rows = await sql`
    SELECT * FROM bookings WHERE fecha = ${fechaISO}::date LIMIT 1
  `;
  const list = rows as unknown as Booking[];
  return list[0] ?? null;
}

export async function repoListBookingsByAulaAndNombre(
  sql: NeonSql,
  aula: string,
  nombre: string
): Promise<Booking[]> {
  const rows = await sql`
    SELECT * FROM bookings
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
    SELECT * FROM bookings
    WHERE aula = ${aula}
    ORDER BY fecha ASC
  `;
  return rows as unknown as Booking[];
}

export async function repoGetBookingIdByFecha(
  sql: NeonSql,
  fechaISO: string
): Promise<{ id: string } | null> {
  const rows = await sql`
    SELECT id FROM bookings WHERE fecha = ${fechaISO}::date LIMIT 1
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
      RETURNING *
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

export async function repoUpdateBookingStatus(
  sql: NeonSql,
  id: string,
  status: Booking["status"]
): Promise<{ ok: true; booking: Booking } | { ok: false; notFound: boolean; message: string }> {
  try {
    const rows = await sql`
      UPDATE bookings SET status = ${status}
      WHERE id = ${id}::uuid
      RETURNING *
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
