import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Siira — Orientation et financement des soins",
  description:
    "Plateforme d'orientation et de financement des soins pour le cancer du sein, du centre de santé au spécialiste.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-fond text-texte-principal">
        {children}
      </body>
    </html>
  );
}
