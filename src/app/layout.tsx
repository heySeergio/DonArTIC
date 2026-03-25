import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import RouteFade from "@/components/RouteFade";

const headings = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "DonArTIC Reservas",
  description: "Reservas de talleres de arte · CEE Príncipe Don Juan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${headings.variable} ${bodyFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-body bg-[color:var(--bg)] text-[color:var(--text)]"
        suppressHydrationWarning
      >
        <RouteFade>{children}</RouteFade>
      </body>
    </html>
  );
}
