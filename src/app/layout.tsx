import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

/* Polices servies par le site, deux graisses chacune pour rester leger. */
const titre = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--police-titre",
  display: "swap",
});

const texte = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--police-texte",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Siira, le chemin vers les soins",
    template: "%s | Siira",
  },
  description:
    "Siira accompagne une femme du premier doute jusqu'a sa prise en charge par un specialiste, avec un financement des soins par des ONG partenaires.",
  applicationName: "Siira",
  icons: {
    icon: [{ url: "/brand/icon-32.png", sizes: "32x32" }],
    apple: [{ url: "/brand/apple-icon.png" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2a1a20",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${titre.variable} ${texte.variable}`}>
      <body>
        <a href="#contenu" className="lien-evitement">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
