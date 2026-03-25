-- DonArTIC Reservas (CEE Príncipe Don Juan)
-- Tabla principal: bookings

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fecha date not null unique,
  aula text not null,
  nombre text not null,
  idea text not null,
  num_alumnos integer not null check (num_alumnos between 1 and 30),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmada', 'cancelada'))
);

-- RLS: la app opera vía API routes con service role,
-- así que bloqueamos acceso directo desde clientes.
alter table public.bookings enable row level security;

revoke all on table public.bookings from anon, authenticated;

-- No policies a propósito (servirá como “deny by default”).

