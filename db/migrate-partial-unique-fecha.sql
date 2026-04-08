-- Ejecutar una vez si la tabla ya existía con UNIQUE(fecha) y bloqueaba nuevas reservas tras cancelar.
-- También lo aplica `npm run db:setup` de forma idempotente.

alter table public.bookings drop constraint if exists bookings_fecha_key;

create unique index if not exists bookings_one_active_per_fecha
  on public.bookings (fecha)
  where status in ('pendiente', 'confirmada');
