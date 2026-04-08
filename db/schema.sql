-- DonArTIC · Neon / PostgreSQL
-- Ejecutar una vez en el SQL Editor de Neon (o psql).

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fecha date not null,
  aula text not null,
  nombre text not null,
  idea text not null,
  num_alumnos integer not null check (num_alumnos between 1 and 30),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmada', 'cancelada'))
);

-- Solo una reserva “activa” por fecha; las canceladas liberan el día para una nueva reserva.
create unique index if not exists bookings_one_active_per_fecha
  on public.bookings (fecha)
  where status in ('pendiente', 'confirmada');

create index if not exists bookings_aula_fecha_idx on public.bookings (aula, fecha);
create index if not exists bookings_nombre_fecha_idx on public.bookings (nombre, fecha);
