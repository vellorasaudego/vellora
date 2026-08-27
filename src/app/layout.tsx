import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vellora Saúde | Gestão e assistência domiciliar em Goiânia",
    template: "%s | Vellora Saúde",
  },
  description:
    "Cuidado domiciliar planejado para cada família, com cuidadores e profissionais de enfermagem, gestão de escalas e acompanhamento digital em Goiânia e região.",
  keywords: [
    "home care Goiânia",
    "cuidador de idosos Goiânia",
    "técnico de enfermagem domiciliar",
    "assistência domiciliar",
    "Vellora Saúde",
  ],
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
