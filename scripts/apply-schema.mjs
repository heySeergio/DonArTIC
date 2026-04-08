/**
 * Crea la tabla `bookings` en Neon (usa DATABASE_URL del entorno).
 *
 * Uso:
 *   npm run db:setup
 *
 * Lee `.env.local` en la raíz del proyecto si las variables no están ya en el entorno.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL;

if (!url) {
  console.error(
    "Falta DATABASE_URL (o POSTGRES_URL / POSTGRES_PRISMA_URL). Revisa .env.local o exporta la variable."
  );
  process.exit(1);
}

const sql = neon(url);

async function main() {
  await sql`create extension if not exists pgcrypto`;

  await sql`
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
    )
  `;

  await sql`alter table public.bookings drop constraint if exists bookings_fecha_key`;
  await sql`
    create unique index if not exists bookings_one_active_per_fecha
      on public.bookings (fecha)
      where status in ('pendiente', 'confirmada')
  `;

  await sql`
    create index if not exists bookings_aula_fecha_idx on public.bookings (aula, fecha)
  `;
  await sql`
    create index if not exists bookings_nombre_fecha_idx on public.bookings (nombre, fecha)
  `;

  console.log("Listo: tabla public.bookings e índices creados (o ya existían).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
