/**
 * Colores de acento por nombre de aula/clase (calendarios y celdas ocupadas).
 *
 * Amarillo: 2ºA, cualquier 1º…, INFANTIL, TVA 5
 * Azul: TVA 1–4, CONFECCIÓN
 * Verde: el resto
 */

export const AULA_COLOR_AMARILLO = "#FEF502";
export const AULA_COLOR_AZUL = "#0328B2";
export const AULA_COLOR_VERDE = "#91F539";

function normalizeAula(aula: string): { normalized: string; compact: string } {
  const normalized = aula
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const compact = normalized.replace(/\s+/g, "");
  return { normalized, compact };
}

/** Color hex para tintes de celda y puntos (siempre uno de los tres). */
export function bookingAulaAccentColor(aula: string): string {
  const { normalized, compact } = normalizeAula(aula);

  const tva = compact.match(/^TVA(\d+)$/i);
  if (tva) {
    const n = tva[1];
    if (n === "5") return AULA_COLOR_AMARILLO;
    if (["1", "2", "3", "4"].includes(n)) return AULA_COLOR_AZUL;
    return AULA_COLOR_VERDE;
  }

  if (normalized === "INFANTIL") return AULA_COLOR_AMARILLO;

  if (/^2(?:º|°)A$/i.test(compact)) return AULA_COLOR_AMARILLO;

  if (/^1(?:º|°)/.test(compact)) return AULA_COLOR_AMARILLO;

  if (normalized.includes("CONFECCION")) return AULA_COLOR_AZUL;

  return AULA_COLOR_VERDE;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
