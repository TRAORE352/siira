/** Navigation de chaque espace. */

export interface LienNav {
  href: string;
  libelle: string;
}

export const LIENS_CENTRE: LienNav[] = [
  { href: "/centre", libelle: "Tableau de bord" },
  { href: "/centre/patientes", libelle: "Patientes" },
  { href: "/centre/suivi", libelle: "Suivi des soins" },
  { href: "/centre/prises-en-charge", libelle: "Prises en charge" },
  { href: "/centre/disponibilites", libelle: "Disponibilités" },
];

