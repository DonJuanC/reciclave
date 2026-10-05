import type { Metadata } from "next";
import { Anton, Barlow } from "next/font/google";
import "./globals.css";

// Anton: titulares de cartel. Barlow: texto corrido.
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reciclá, ve",
  description: "¿En qué caneca va? Clasificador de residuos según el código de colores de Colombia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${anton.variable} ${barlow.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
