import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Personal Trainer",
  description: "Tu entrenador personal de inglés hablado.",
  manifest: "/manifest.json",
};

// Explícito en vez de confiar en el default de Next: fuerza que el celular
// renderice al ancho real del dispositivo (sin esto, algunos navegadores
// móviles "simulan" un ancho de escritorio y todo se ve diminuto), y fija
// el color de la barra del navegador para que combine con el dark mode de
// la app en vez de mostrar blanco.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B131C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
