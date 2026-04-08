"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import { useRouter } from "next/navigation";
import type { Booking } from "@/lib/types";
import {
  clearNextBookingAfterISO,
  clearProfile,
  getNextBookingAfterISO,
  getProfile,
  setNextBookingAfterISO,
  loadMyBookings,
  upsertMyBooking,
} from "@/lib/storage";
import { normalizeBookingFechaKey, parseISODate, toISODate } from "@/lib/dates";
import Header from "@/components/Header";
import CalendarGrid from "@/components/CalendarGrid";
import BookingModal from "@/components/BookingModal";

export default function CalendarioPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ aula: string; nombre: string } | null>(
    null
  );
  const [selectedFecha, setSelectedFecha] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cooldownUntilISO, setCooldownUntilISO] = useState<string | null>(null);

  useEffect(() => {
    try {
      const p = getProfile();
      if (!p) router.replace("/");
      else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile(p);
        const nextAfter = getNextBookingAfterISO();
        if (!nextAfter) {
          setCooldownUntilISO(null);
          return;
        }

        // Salvaguarda: si la clave de cooldown quedó “stale” (por ejemplo,
        // porque no existe ninguna reserva en cache que la justifique),
        // limpiamos para no bloquear el calendario indefinidamente.
        const nextAfterDate = parseISODate(nextAfter);
        if (!nextAfterDate) {
          clearNextBookingAfterISO();
          setCooldownUntilISO(null);
          return;
        }

        const expectedBookingDate = toISODate(addDays(nextAfterDate, -14));
        const cached = loadMyBookings();
        const hasMatchingBooking = cached.some(
          (b) =>
            b.aula === p.aula &&
            b.nombre === p.nombre &&
            normalizeBookingFechaKey(b.fecha) === expectedBookingDate &&
            b.status !== "cancelada"
        );

        if (!hasMatchingBooking) {
          clearNextBookingAfterISO();
          setCooldownUntilISO(null);
          return;
        }

        setCooldownUntilISO(nextAfter);
      }
    } catch {
      router.replace("/");
    }
  }, [router]);

  const onChangeProfile = () => {
    clearProfile();
    clearNextBookingAfterISO();
    setCooldownUntilISO(null);
    router.replace("/");
  };

  const onBooked = (booking: Booking) => {
    // Mantener cache local para “Mis reservas”
    upsertMyBooking(booking);
    const bookedDate = parseISODate(booking.fecha);
    if (bookedDate) {
      const nextAfter = toISODate(addDays(bookedDate, 14));
      setNextBookingAfterISO(nextAfter);
      setCooldownUntilISO(nextAfter);
    }
    setRefreshKey((k) => k + 1);
  };

  const headerProfile = useMemo(() => profile ?? undefined, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="h-12 w-12 rounded-full border border-[color:var(--border)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        profile={headerProfile}
        onChangeProfile={onChangeProfile}
        showMyBookingsLink
      />

      <main className="flex-1 px-4 md:px-8 pb-10">
        <div className="max-w-[980px] mx-auto">
          <h1 className="font-headings text-3xl md:text-4xl text-[color:var(--brown)]">
            Elige una fecha
          </h1>
          <p className="mt-2 text-[color:var(--muted)] font-medium">
            Lunes · Miércoles · Viernes · 13:00–14:30h
          </p>

          {cooldownUntilISO ? (
            <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-white/70 px-4 py-3 text-sm text-[color:var(--muted)]">
              Tras confirmar tu reserva, el calendario se bloquea hasta{" "}
              <span className="font-semibold text-[color:var(--navy)]">
                {(() => {
                  const d = parseISODate(cooldownUntilISO);
                  return d ? toISODate(d) : cooldownUntilISO;
                })()}
              </span>
              .
            </div>
          ) : null}

          <div className="mt-6">
            <CalendarGrid
              selectedFecha={selectedFecha}
              refreshKey={refreshKey}
              onSelectFecha={(iso) => setSelectedFecha(iso)}
              cooldownUntilISO={cooldownUntilISO}
            />
          </div>
        </div>
      </main>

      <BookingModal
        open={selectedFecha !== null}
        selectedFecha={selectedFecha}
        profile={{ aula: profile.aula, nombre: profile.nombre }}
        onClose={() => setSelectedFecha(null)}
        onBooked={onBooked}
        cooldownUntilISO={cooldownUntilISO}
      />
    </div>
  );
}

