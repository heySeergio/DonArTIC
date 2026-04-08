"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking } from "@/lib/types";
import {
  clearProfile,
  getProfile,
  loadMyBookings,
  saveMyBookings,
  cancelMyBookingInCache,
  removeMyBookingFromCache,
} from "@/lib/storage";
import { isFutureDate, parseISODate } from "@/lib/dates";
import Header from "@/components/Header";
import BookingCard from "@/components/BookingCard";

export default function MisReservasPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ aula: string; nombre: string } | null>(
    null
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const p = getProfile();
      if (!p) router.replace("/");
      else setProfile(p);
    } catch {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    const p = profile;

    const loadFromCache = () => {
      const cached = loadMyBookings();
      setBookings(cached.filter((b) => b.aula === p.aula));
    };

    loadFromCache();

    // Reconciliar con DB para evitar desincronización.
    async function loadFromApi() {
      setLoading(true);
      try {
        const res = await fetch(`/api/bookings?aula=${encodeURIComponent(p.aula)}`);
        if (!res.ok) return;
        const data = (await res.json()) as Booking[];
        setBookings(data ?? []);

        // Actualizar caché: reemplaza solo las reservas de este aula.
        const all = loadMyBookings();
        const rest = all.filter((b) => b.aula !== p.aula);
        saveMyBookings([...rest, ...(data ?? [])]);
      } finally {
        setLoading(false);
      }
    }
    loadFromApi();
  }, [profile]);

  const onChangeProfile = () => {
    clearProfile();
    router.replace("/");
  };

  const canCancel = (b: Booking) => {
    // Conservamos cancelación solo sobre reservas “propias” del nombre,
    // aunque la lista se muestre a nivel aula.
    if (!profile) return false;
    if (b.nombre !== profile.nombre) return false;
    if (b.status === "cancelada") return false;
    const d = parseISODate(b.fecha);
    if (!d) return false;
    return isFutureDate(d);
  };

  const canDelete = (b: Booking) => {
    if (!profile) return false;
    if (b.nombre !== profile.nombre) return false;
    return b.status === "cancelada";
  };

  const onCancel = async (b: Booking) => {
    const res = await fetch(`/api/bookings/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelada" }),
    });
    if (!res.ok) return;

    cancelMyBookingInCache(b.id, "cancelada");
    setBookings((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, status: "cancelada" } : x))
    );
  };

  const onDelete = async (b: Booking) => {
    if (!profile) return;
    const res = await fetch(`/api/bookings/${b.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aula: profile.aula, nombre: profile.nombre }),
    });
    if (!res.ok) return;
    removeMyBookingFromCache(b.id);
    setBookings((prev) => prev.filter((x) => x.id !== b.id));
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
        showCalendarLink
      />

      <main className="flex-1 px-4 md:px-8 pb-10">
        <div className="max-w-[980px] mx-auto">
          <h1 className="font-headings text-3xl md:text-4xl text-[color:var(--brown)]">
            Mis reservas
          </h1>
          <p className="mt-2 text-[color:var(--muted)] font-medium">
            Tus talleres programados para esta aula
          </p>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="card h-28 animate-pulse"
                  />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="card p-6 text-[color:var(--muted)]">
                Aún no tienes reservas. Vuelve al calendario para reservar tu
                taller.
              </div>
            ) : (
              bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  canCancel={canCancel(b)}
                  onCancel={() => onCancel(b)}
                  canDelete={canDelete(b)}
                  onDelete={() => onDelete(b)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

