import { neon } from "@neondatabase/serverless";

export type NeonSql = ReturnType<typeof neon>;

let cached: NeonSql | null | undefined;

/**
 * Cliente SQL para Neon (usa DATABASE_URL del pooler en serverless).
 */
export function getSql(): NeonSql | null {
  if (cached !== undefined) return cached;
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL;
  if (!url) {
    cached = null;
    return null;
  }
  cached = neon(url);
  return cached;
}
