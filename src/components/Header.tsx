"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";
import ColorSwatches from "@/components/ColorSwatches";
import TransparentLogo from "@/components/TransparentLogo";

export default function Header({
  profile,
  onChangeProfile,
  showMyBookingsLink,
  showCalendarLink,
}: {
  profile?: { aula: string; nombre: string };
  onChangeProfile?: MouseEventHandler<HTMLButtonElement>;
  showMyBookingsLink?: boolean;
  showCalendarLink?: boolean;
}) {
  return (
    <header className="w-full px-4 md:px-8 py-4 flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <Link href="/" className="flex items-start">
          <TransparentLogo className="max-h-[48px] w-auto" alt="DonArTIC" />
        </Link>
        <div className="mt-1">
          <ColorSwatches />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {(showCalendarLink || showMyBookingsLink) && (
          <nav className="flex items-center gap-3">
            {showCalendarLink && (
              <Link
                href="/calendario"
                className="text-sm font-medium text-[color:var(--navy)] hover:underline"
              >
                Calendario
              </Link>
            )}
            {showMyBookingsLink && (
              <Link
                href="/mis-reservas"
                className="text-sm font-medium text-[color:var(--navy)] hover:underline"
              >
                Mis reservas
              </Link>
            )}
          </nav>
        )}

        {profile && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full border border-[color:var(--border)] bg-white/70 backdrop-blur-sm text-sm text-[color:var(--text)]">
              {profile.aula} · {profile.nombre}
            </div>
            {onChangeProfile && (
              <button
                type="button"
                onClick={onChangeProfile}
                className="text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--text)] underline"
              >
                Cambiar
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

