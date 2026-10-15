/** Navigation de chaque espace. */

export interface LienNav {
  href: string;
  libelle: string;
}

export const LIENS_CENTRE: LienNav[] = [
  { href: "/centre", libelle: "Patientes reçues" },
  { href: "/centre/disponibilites", libelle: "Disponibilités" },
];

