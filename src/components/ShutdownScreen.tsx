import ColorSwatches from "@/components/ColorSwatches";
import TransparentLogo from "@/components/TransparentLogo";

export default function ShutdownScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <section className="card w-full max-w-[520px] p-6 md:p-8 text-center">
        <div className="flex flex-col items-center">
          <TransparentLogo alt="DonArTIC" />
          <div className="mt-2">
            <ColorSwatches />
          </div>
        </div>

        <p className="mt-8 font-headings text-2xl leading-snug text-[color:var(--brown)]">
          DonArTIC ha dejado de ofrecer servicios.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
          Gracias a todos los profesores y alumnos por ser participes del
          proyecto.
        </p>
      </section>
    </div>
  );
}
