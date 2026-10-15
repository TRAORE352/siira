import type { MetadataRoute } from "next";
import { ESPACE_ACTIF, accueilEspace, nomEspace, presentationEspace } from "@/lib/espaces";

/**
 * Manifeste d'application installable.
 *
 * L'adresse d'ouverture suit l'espace : installée depuis l'adresse de l'agent,
 * l'application s'ouvre directement sur ses patientes, sans barre de navigateur.
 * C'est le mode de travail de l'agent, qui utilise un téléphone d'entrée de
 * gamme, souvent dehors.
 */
export default function manifest(): MetadataRoute.Manifest {
  const espace = ESPACE_ACTIF;

  return {
    name: nomEspace(espace),
    short_name: "Siira",
    description: presentationEspace(espace),
    lang: "fr",
    dir: "ltr",
    start_url: accueilEspace(espace),
    /* Une adresse dédiée s'installe pour son seul espace. */
    scope: espace === "complet" ? "/" : accueilEspace(espace),
    display: "standalone",
    orientation: espace === "agent" ? "portrait" : "any",
    /* Couleurs reprises des jetons de design : fond sable, en-tête prune. */
    background_color: "#fbfaf9",
    theme_color: "#2a1a20",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
