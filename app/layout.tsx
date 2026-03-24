import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HORUS Barber SaaS",
  description: "SaaS multi-tenant completo para gestao de barbearias"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
