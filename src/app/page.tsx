"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingForm, {
  type OnboardingData,
} from "@/components/OnboardingForm";
import ColorSwatches from "@/components/ColorSwatches";
import TransparentLogo from "@/components/TransparentLogo";

const PROFILE_KEY = "donartic.profile";
const DISCLAIMER_SEEN_KEY = "donartic.disclaimerSeen";

export default function Home() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    try {
      const disclaimerSeen = localStorage.getItem(DISCLAIMER_SEEN_KEY);
      if (!disclaimerSeen) {
        setShowDisclaimer(true);
      }

      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<OnboardingData>;
      if (parsed?.aula && parsed?.nombre) {
        router.replace("/calendario");
      }
    } catch {
      // Ignorar si el localStorage está corrupto.
    }
  }, [router]);

  const onContinue = (data: OnboardingData) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    router.replace("/calendario");
  };

  const onCloseDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_SEEN_KEY, "true");
    setShowDisclaimer(false);
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="h-12 w-12 rounded-full border border-[color:var(--border)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-[520px] p-6 md:p-8">
            <h2 className="font-headings text-2xl text-[color:var(--brown)]">
              Aviso importante
            </h2>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Esta página está pensada para que los{" "}
              <strong className="text-[color:var(--text)]">PROFESORES</strong>{" "}
              agenden el taller. No está destinada a que lo hagan las familias o
              padres.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn-solid"
                onClick={onCloseDisclaimer}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="card w-full max-w-[420px] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <TransparentLogo alt="DonArTIC" />
            <div className="mt-2">
              <ColorSwatches />
            </div>
          </div>
        </div>

        <h1 className="mt-6 font-headings text-[32px] leading-[1.05] text-[color:var(--brown)]">
          Reserva tu taller
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          CEE Príncipe Don Juan · L/M/X/V · 13:00–14:30h
        </p>

        <div className="mt-6">
          <OnboardingForm onContinue={onContinue} />
        </div>
      </section>
    </div>
  );
}
