"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ColorSwatches from "@/components/ColorSwatches";
import AdminCalendar from "@/components/AdminCalendar";
import AdminTable from "@/components/AdminTable";
import TransparentLogo from "@/components/TransparentLogo";
import Link from "next/link";

const ADMIN_AUTH_KEY = "donartic.adminAuth";
const ADMIN_PASSWORD_SESSION_KEY = "donartic.adminPassword";

type Tab = "calendario" | "reservas";

export default function AdminPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("calendario");
  const [refreshKey, setRefreshKey] = useState(0);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    try {
      const authed = localStorage.getItem(ADMIN_AUTH_KEY) === "true";
      const storedPassword =
        sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY);
      if (authed && storedPassword) {
        setAdminAuth(true);
        setAdminPassword(storedPassword);
      }
    } catch {
      // ignore
    }
  }, []);

  const logout = () => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem(ADMIN_PASSWORD_SESSION_KEY);
    setAdminAuth(false);
    setAdminPassword(null);
    setPasswordInput("");
    setError(null);
    setTab("calendario");
  };

  const verify = async () => {
    setError(null);
    const pwd = passwordInput.trim();
    try {
      const res = await fetch("/api/bookings", {
        headers: { "x-admin-password": pwd },
      });
      if (!res.ok) {
        setError("Contraseña incorrecta.");
        return;
      }
      localStorage.setItem(ADMIN_AUTH_KEY, "true");
      sessionStorage.setItem(ADMIN_PASSWORD_SESSION_KEY, pwd);
      setAdminAuth(true);
      setAdminPassword(pwd);
    } catch {
      setError("No se pudo verificar la contraseña.");
    }
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  const header = useMemo(() => {
    return (
      <header className="w-full px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-start">
              <Link href="/">
                <TransparentLogo alt="DonArTIC" />
              </Link>
          </div>
          <div className="mt-1">
            <ColorSwatches />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white/70 px-2 py-1">
            <button
              type="button"
              onClick={() => setTab("calendario")}
              className={`h-9 px-4 rounded-full text-sm font-semibold transition-colors ${
                tab === "calendario"
                  ? "bg-[color:var(--navy)] text-white"
                  : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
              }`}
            >
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setTab("reservas")}
              className={`h-9 px-4 rounded-full text-sm font-semibold transition-colors ${
                tab === "reservas"
                  ? "bg-[color:var(--navy)] text-white"
                  : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
              }`}
            >
              Reservas
            </button>
          </nav>

          <button
            type="button"
            onClick={logout}
            className="text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] underline"
          >
            Logout
          </button>
        </div>
      </header>
    );
  }, [tab]);

  if (!hydrated) {
    return null;
  }

  if (!adminAuth || !adminPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <section className="card w-full max-w-[420px] p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <TransparentLogo
                alt="DonArTIC"
              />
              <div className="mt-2">
                <ColorSwatches />
              </div>
            </div>
          </div>

          <h1 className="mt-6 font-headings text-[28px] leading-[1.05] text-[color:var(--brown)]">
            Acceso admin
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Introduce la contraseña para gestionar reservas.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Contraseña"
              className="h-12 rounded-lg border border-[color:var(--border)] bg-white px-3 outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
            />

            {error && (
              <div className="rounded-lg border border-[color:var(--magenta)]/30 bg-[color:var(--magenta)]/10 px-3 py-2 text-sm text-[color:var(--magenta)]">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={verify}
              className="h-12 rounded-lg bg-[color:var(--brown)] text-white font-semibold hover:opacity-95 disabled:opacity-60"
              disabled={!passwordInput.trim()}
            >
              Entrar →
            </button>

            <button
              type="button"
              onClick={() => router.push("/calendario")}
              className="text-sm font-semibold text-[color:var(--navy)] hover:underline"
            >
              Volver al calendario
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {header}

      <main className="flex-1 px-4 md:px-8 pb-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-4 rounded-xl border border-[color:var(--magenta)]/30 bg-[color:var(--magenta)]/10 px-4 py-3 text-sm text-[color:var(--text)]">
            <span className="font-semibold">Aviso:</span> antes de confirmar
            reservas, revisa que no estén hechas por padres y que correspondan
            a profesorado.
          </div>
          {tab === "calendario" ? (
            <AdminCalendar
              adminPassword={adminPassword}
              refreshKey={refreshKey}
              onNeedRefresh={refresh}
            />
          ) : (
            <AdminTable
              adminPassword={adminPassword}
              refreshKey={refreshKey}
              onNeedRefresh={refresh}
            />
          )}
        </div>
      </main>
    </div>
  );
}

