import type { Booking } from "@/lib/types";
import { normalizeBookingFechaKey } from "@/lib/dates";

/** Mapa fecha → reserva para calendario admin: prioriza pendiente/confirmada sobre cancelada. */
export function bookingsByDatePreferActive(
  bookings: Booking[]
): Record<string, Booking> {
  const groups = new Map<string, Booking[]>();
  for (const b of bookings) {
    const k = normalizeBookingFechaKey(b.fecha);
    const g = groups.get(k) ?? [];
    g.push(b);
    groups.set(k, g);
  }
  const out: Record<string, Booking> = {};
  for (const [k, arr] of groups) {
    const active = arr.find((x) => x.status !== "cancelada");
    out[k] = active ?? arr[arr.length - 1];
  }
  return out;
}
