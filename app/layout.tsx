import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARCO POLÍTICO",
  description: "Posiciona partidos y personas sobre el arco ideológico y compara con el resto.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-sm font-extrabold tracking-[.22em]">
            ARCO <span className="bg-gradient-to-r from-red-600 via-gray-400 to-blue-600 bg-clip-text text-transparent">POLÍTICO</span>
          </Link>
        </header>
        <main className="mx-auto max-w-5xl px-5 pb-20">{children}</main>
      </body>
    </html>
  );
}
