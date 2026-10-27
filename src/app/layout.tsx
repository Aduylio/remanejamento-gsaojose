import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Remanejamento — Grupo São José",
    template: "%s | Remanejamento — Grupo São José",
  },
  description:
    "Sistema interno para cadastrar, acompanhar e confirmar o remanejamento de mercadorias entre lojas.",
  applicationName: "Remanejamento",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--color-bg)] font-sans text-[var(--color-text-primary)]">
        {children}
      </body>
    </html>
  );
}
