/**
 * Espaces de Siira.
 *
 * Le dossier demande une seule application, pour trois publics : l'agent qui
 * travaille sur un téléphone d'entrée de gamme, puis le centre spécialisé et
 * l'ONG qui travaillent sur ordinateur. Chaque public reçoit son adresse, et
 * chaque adresse est un déploiement du même code, qui déclare son espace par
 * la variable `NEXT_PUBLIC_ESPACE` :
 *
 *   NEXT_PUBLIC_ESPACE=agent   -> espace agent de santé
 *   NEXT_PUBLIC_ESPACE=centre  -> espace centre spécialisé
 *   NEXT_PUBLIC_ESPACE=ong     -> espace ONG partenaire
 *   (variable absente)         -> application complète, les quatre rôles
 *
 * L'application complète est l'adresse de démonstration : c'est la seule où
 * les trois espaces partagent les mêmes données, puisque l'état de la
 * démonstration vit dans le stockage du navigateur, propre à chaque adresse.
 *
 * Ce fichier ne dépend de rien et n'est pas marqué « client » : il est lu par
 * le middleware, qui s'exécute sur le serveur, comme par les écrans.
 */

import type { Profil, Role } from "./types";

export type Espace = "agent" | "centre" | "ong" | "complet";

export const ROLES: readonly Role[] = ["agent", "centre", "ong", "admin"];

/** Page d'accueil de chaque rôle. */
export const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  agent: "/agent",
  centre: "/centre",
  ong: "/ong",
  admin: "/admin",
};

export const LIBELLE_ROLE: Record<Role, string> = {
  agent: "Agent de santé",
  centre: "Centre spécialisé",
  ong: "ONG partenaire",
  admin: "Équipe Siira",
};

/** Lit la valeur brute de configuration. Toute valeur inconnue donne l'application complète. */
export function lireEspace(valeur: string | undefined): Espace {
  const v = (valeur ?? "").trim().toLowerCase();
  return v === "agent" || v === "centre" || v === "ong" ? v : "complet";
}

/** Espace de cette adresse, fixé au moment de la construction. */
export const ESPACE_ACTIF: Espace = lireEspace(process.env.NEXT_PUBLIC_ESPACE);

/** Rôles admis sur une adresse. */
export function rolesEspace(espace: Espace): Role[] {
  return espace === "complet" ? [...ROLES] : [espace];
}

export function roleAutorise(espace: Espace, role: Role): boolean {
  return rolesEspace(espace).includes(role);
}

/** Chemins toujours ouverts, quel que soit l'espace. */
export const CHEMINS_PUBLICS: readonly string[] = ["/", "/connexion"];

/**
 * Un chemin est-il ouvert sur cette adresse ?
 * L'application complète ouvre tout. Une adresse dédiée n'ouvre que la racine,
 * la connexion et les écrans de son espace : les écrans des autres ne sont pas
 * seulement cachés, ils sont refusés.
 */
export function cheminAutorise(espace: Espace, chemin: string): boolean {
  if (espace === "complet") return true;
  if (CHEMINS_PUBLICS.includes(chemin)) return true;
  const prefixe = ACCUEIL_PAR_ROLE[espace];
  return chemin === prefixe || chemin.startsWith(`${prefixe}/`);
}

/** Où renvoyer quelqu'un qui a ouvert un écran d'un autre espace. */
export function cheminRefus(espace: Espace): string {
  return espace === "complet" ? "/" : "/connexion";
}

/** Adresse d'entrée de l'espace, utilisée par le manifeste de l'application. */
export function accueilEspace(espace: Espace): string {
  return espace === "complet" ? "/" : ACCUEIL_PAR_ROLE[espace];
}

/* Textes propres à chaque espace. Ils sont écrits pour la personne qui les lit,
   en français simple, sans terme technique. */

export function nomEspace(espace: Espace): string {
  switch (espace) {
    case "agent":
      return "Siira, espace agent de santé";
    case "centre":
      return "Siira, espace centre spécialisé";
    case "ong":
      return "Siira, espace ONG partenaire";
    default:
      return "Siira, le chemin vers les soins";
  }
}

export function titreEspace(espace: Espace): string {
  switch (espace) {
    case "agent":
      return "L’espace des agents de santé";
    case "centre":
      return "L’espace des centres spécialisés";
    case "ong":
      return "L’espace des ONG partenaires";
    default:
      return "Le chemin vers les soins";
  }
}

export function presentationEspace(espace: Espace): string {
  switch (espace) {
    case "agent":
      return "Enregistrez une patiente, dictez ce qu’elle ressent, validez le niveau d’urgence et envoyez le dossier au centre spécialisé.";
    case "centre":
      return "Recevez les dossiers orientés vers votre centre, suivez les examens et enregistrez les résultats.";
    case "ong":
      return "Financez les soins des femmes qui ne peuvent pas en payer les frais. Aucune donnée d’identité ne vous est transmise.";
    default:
      return "Siira accompagne une femme du premier doute jusqu’à sa prise en charge par un spécialiste.";
  }
}

/** Petite phrase qui rappelle à l'écran sur quel espace on se trouve. */
export function mentionEspace(espace: Espace): string | null {
  switch (espace) {
    case "agent":
      return "Espace agent de santé";
    case "centre":
      return "Espace centre spécialisé";
    case "ong":
      return "Espace ONG partenaire";
    default:
      return null;
  }
}

/** Comptes de démonstration proposés sur cette adresse. */
export function comptesDeLespace(espace: Espace, profils: Profil[]): Profil[] {
  const roles = rolesEspace(espace);
  return profils.filter((p) => roles.includes(p.role));
}
