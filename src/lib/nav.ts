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

/** Espace équipe Siira : la console de la plateforme. */
export const LIENS_ADMIN: LienNav[] = [
  { href: "/admin", libelle: "Tableau de bord" },
  { href: "/admin/comptes", libelle: "Comptes" },
  { href: "/admin/centres", libelle: "Centres et tarifs" },
  { href: "/admin/financeurs", libelle: "Financeurs" },
  { href: "/admin/demonstration", libelle: "Démonstration" },
];

