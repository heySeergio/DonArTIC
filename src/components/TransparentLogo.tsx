"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

function makeTransparentFromBlack(dataUrl: string, threshold = 60) {
  return new Promise<string>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      // Recorta la parte inferior del logo (los “recuadros” de color),
      // dejándola transparente.
      const cropPx = 10; // para un PNG de 48px de alto aprox.
      const cropY = Math.max(0, canvas.height - cropPx);

      // Quitar fondo negro:
      // no solo “r,g,b <= threshold”, sino por luminancia para tolerar variaciones/compresión.
      const w = canvas.width;
      const h = canvas.height;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const a = d[i + 3];

          // Si ya es transparente, lo dejamos.
          if (a === 0) continue;

          // Recorte por zona inferior.
          if (y >= cropY) {
            d[i + 3] = 0;
            continue;
          }

          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (luminance <= threshold) {
            d[i + 3] = 0;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = dataUrl;
  });
}

export default function TransparentLogo({
  className,
  alt,
}: {
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const cacheKey = useMemo(() => "donartic.transparentLogo.v3", []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          if (!cancelled) setSrc(cached);
          return;
        }

        // Usamos fetch para evitar problemas de CORS con canvas.
        const res = await fetch("/DonArTIC.png");
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("No se pudo leer el blob"));
          reader.readAsDataURL(blob);
        });

        const transparent = await makeTransparentFromBlack(base64, 60);
        sessionStorage.setItem(cacheKey, transparent);
        if (!cancelled) setSrc(transparent);
      } catch {
        // Si falla, devolvemos el PNG original.
        if (!cancelled) setSrc("/DonArTIC.png");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  return (
    <Image
      src={src ?? "/DonArTIC.png"}
      alt={alt ?? "DonArTIC"}
      width={220}
      height={48}
      className={className ?? "max-h-[48px] w-auto"}
      // Evita warnings de next/image cuando el CSS altera dimensiones.
      style={{ width: "auto", height: "auto" }}
      priority
    />
  );
}

