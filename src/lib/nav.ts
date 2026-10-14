/** Navigation de chaque espace. */

export interface LienNav {
  href: string;
  libelle: string;
}

export const LIENS_CENTRE: LienNav[] = [
  { href: "/centre", libelle: "Patientes reçues" },
  { href: "/centre/disponibilites", libelle: "Disponibilités" },
];

export const LIENS_ONG: LienNav[] = [
  { href: "/ong", libelle: "Demandes" },
  { href: "/ong/regles", libelle: "Mes règles" },
  { href: "/ong/impact", libelle: "Impact" },
];
