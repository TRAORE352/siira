import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Ouverture, ScriptOuverture } from "@/components/Ouverture";
import { ServiceWorker } from "@/components/ServiceWorker";
import { ESPACE_ACTIF, nomEspace, presentationEspace } from "@/lib/espaces";
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
  /* Le titre suit l'espace : l'onglet d'un agent ne dit pas la même chose que
     celui d'un centre spécialisé. */
  title: {
    default: nomEspace(ESPACE_ACTIF),
    template: "%s | Siira",
  },
  description: presentationEspace(ESPACE_ACTIF),
  applicationName: "Siira",
  /* Installation sur le téléphone, notamment pour les agents. */
  appleWebApp: {
    capable: true,
    title: "Siira",
    statusBarStyle: "default",
  },
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
      <head>
        {/*
          Décide avant la première peinture si l'écran d'ouverture doit
          s'afficher. Dans le <head> et bloquant à dessein : après, il serait
          trop tard et le rideau clignoterait.
        */}
        {ESPACE_ACTIF === "agent" ? <ScriptOuverture /> : null}
      </head>
      <body>
        <a href="#contenu" className="lien-evitement">
          Aller au contenu
        </a>
        {/*
          Écran d'ouverture, réservé à l'application de l'agent : elle est
          installée sur son téléphone et démarrée plusieurs fois par jour. Les
          espaces d'ordinateur n'en ont pas besoin, et le jury ne doit pas le
          revoir à chaque onglet pendant la démonstration.
        */}
        {ESPACE_ACTIF === "agent" ? <Ouverture /> : null}
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
