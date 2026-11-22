import type { Metadata } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { Footer } from "@/components/Footer";
import "./globals.css";

// Fonte de títulos: Bodoni, clássica de perfumaria e moda.
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// Fonte de texto: Jost, geométrica e limpa.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Catálogo de Perfumes",
  description: "Encontre perfumes, veja notas, acordes e famílias olfativas em português.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bodoni.variable} ${jost.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        {children}
        <Footer />
      </body>
    </html>
  );
}
