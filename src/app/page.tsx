"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingForm, {
  type OnboardingData,
} from "@/components/OnboardingForm";
import ColorSwatches from "@/components/ColorSwatches";
import TransparentLogo from "@/components/TransparentLogo";

const PROFILE_KEY = "donartic.profile";

export default function Home() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    try {
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

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="h-12 w-12 rounded-full border border-[color:var(--border)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <section className="card w-full max-w-[420px] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <TransparentLogo className="max-h-[48px] w-auto" alt="DonArTIC" />
            <div className="mt-2">
              <ColorSwatches />
            </div>
          </div>
        </div>

        <h1 className="mt-6 font-headings text-[32px] leading-[1.05] text-[color:var(--brown)]">
          Reserva tu taller
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          CEE Príncipe Don Juan · L/X/V · 13:00–14:30h
        </p>

        <div className="mt-6">
          <OnboardingForm onContinue={onContinue} />
        </div>
      </section>
    </div>
  );
}
