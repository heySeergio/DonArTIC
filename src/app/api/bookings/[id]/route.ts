import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isFutureDate, parseISODate } from "@/lib/dates";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function getIsAdmin(request: Request) {
  const provided = request.headers.get("x-admin-password");
  if (!ADMIN_PASSWORD) return false;
  return !!provided && provided === ADMIN_PASSWORD;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Cancelación pública: solo cancelamos si la fecha es futura.
  if (!isAdmin && status === "cancelada") {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, fecha")
      .eq("id", id)
      .maybeSingle();

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

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }

  return NextResponse.json(data, { status: 200 });
}

