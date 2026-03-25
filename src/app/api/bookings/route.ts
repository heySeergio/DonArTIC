import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  isBookingDay,
  isFutureDate,
  isWorkshopAllowedISO,
  parseISODate,
  toISODate,
} from "@/lib/dates";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function requireAdmin(request: Request) {
  const provided = request.headers.get("x-admin-password");
  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD no configurada en el servidor." },
      { status: 500 }
    );
  }
  if (!provided || provided !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    // En desarrollo (sin .env.local) devolvemos datos “vacíos”
    // para que el calendario funcione sin bloquear la UI.
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

  // Admin: GET sin parámetros
  if (!fecha && !aula && !nombre) {
    const adminError = requireAdmin(request);
    if (adminError) return adminError;

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .order("fecha", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  }

  // Disponibilidad: GET ?fecha=YYYY-MM-DD
  if (fecha) {
    const parsed = parseISODate(fecha);
    if (!parsed) {
      return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("fecha", toISODate(parsed))
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? null);
  }

  // Usuario: GET ?aula=X&nombre=Y
  if (aula && nombre) {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("aula", aula)
      .eq("nombre", nombre)
      .order("fecha", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  }

  // Aula: GET ?aula=X (muestra todas las reservas del aula)
  if (aula && !nombre) {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("aula", aula)
      .order("fecha", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  }

  return NextResponse.json(
    {
      error:
        "Parámetros no válidos. Usa ?fecha=YYYY-MM-DD, ?aula=X[&nombre=Y], o GET sin parámetros (admin).",
    },
    { status: 400 }
  );
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase no configurada en el servidor." },
      { status: 500 }
    );
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

  // Una reserva por fecha (también hay UNIQUE en DB).
  const normalizedFecha = toISODate(parsedDate);

  if (!isWorkshopAllowedISO(normalizedFecha)) {
    return NextResponse.json(
      { error: "Esa fecha no está disponible en el calendario laboral." },
      { status: 400 }
    );
  }
  const { data: existing } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("fecha", normalizedFecha)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json(
      { error: "Esta fecha ya está reservada." },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      fecha: normalizedFecha,
      aula,
      nombre,
      idea,
      num_alumnos,
      // status: por defecto “pendiente”
    })
    .select("*")
    .maybeSingle();

  if (error) {
    // Por si el UNIQUE falla en carrera.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Esta fecha ya está reservada." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

