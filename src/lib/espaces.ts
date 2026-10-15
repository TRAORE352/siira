/**
 * Espaces de Siira.
 *
 * Une seule application, pour deux publics : l'agent de santé, qui travaille
 * sur un téléphone d'entrée de gamme, et le centre spécialisé, qui travaille
 * sur ordinateur. Chaque public reçoit son adresse, et chaque adresse est un
 * déploiement du même code, qui déclare son espace par la variable
 * `NEXT_PUBLIC_ESPACE` :
 *
 *   NEXT_PUBLIC_ESPACE=agent   -> espace agent de santé
 *   NEXT_PUBLIC_ESPACE=centre  -> espace centre spécialisé
 *   (variable absente)         -> application complète, pour la démonstration
 *
 * Les ONG ne sont plus un espace : elles financent des soins, mais ne se
 * connectent pas ici. Leur accord se traite hors de l'application, et seul le
 * résultat — « ces soins sont pris en charge, par telle ONG » — est affiché à
 * l'agent et au centre.
 *
 * L'application complète est l'adresse de démonstration : c'est la seule où
 * les espaces partagent les mêmes données, puisque l'état de la démonstration
 * vit dans le stockage du navigateur, propre à chaque adresse.
 *
 * Ce fichier ne dépend de rien et n'est pas marqué « client » : il est lu par
 * le middleware, qui s'exécute sur le serveur, comme par les écrans.
 */

import type { Profil, Role } from "./types";

/**
 * Espaces de déploiement.
 *
 * « ferme » n'est pas un public : c'est l'état d'une adresse dont l'espace a
 * été supprimé. Elle répond, mais n'ouvre aucun écran.
 */
export type Espace = "agent" | "centre" | "complet" | "ferme";

export const ROLES: readonly Role[] = ["agent", "centre", "admin"];

/** Page d'accueil de chaque rôle. */
export const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  agent: "/agent",
  centre: "/centre",
  admin: "/admin",
};

export const LIBELLE_ROLE: Record<Role, string> = {
  agent: "Agent de santé",
  centre: "Centre spécialisé",
  admin: "Équipe Siira",
};

/*
 * Espaces qui ont existé puis disparu.
 *
 * Un déploiement peut rester configuré sur un espace supprimé : la variable
 * vit chez l'hébergeur, pas dans ce dépôt, et personne ne la nettoie en même
 * temps que le code. Les traiter comme « inconnu » serait le pire choix, car
 * l'inconnu ouvre l'application complète : l'ancienne adresse de l'ONG
 * donnerait alors accès à TOUS les écrans, agent et centre compris.
 *
 * Ils sont donc nommés ici et fermés explicitement.
 */
const ESPACES_SUPPRIMES: readonly string[] = ["ong"];

/**
 * Lit la valeur brute de configuration.
 *
 * Trois cas, et un seul comportement sûr pour chacun :
 * - un espace connu          -> cet espace ;
 * - un espace supprimé       -> « ferme », qui n'ouvre rien ;
 * - rien, ou valeur inconnue -> l'application complète, pour la démonstration.
 */
export function lireEspace(valeur: string | undefined): Espace {
  const v = (valeur ?? "").trim().toLowerCase();
  if (v === "agent" || v === "centre") return v;
  if (ESPACES_SUPPRIMES.includes(v)) return "ferme";
  return "complet";
}

/** Espace de cette adresse, fixé au moment de la construction. */
export const ESPACE_ACTIF: Espace = lireEspace(process.env.NEXT_PUBLIC_ESPACE);

/** Rôles admis sur une adresse. Une adresse fermée n'en admet aucun. */
export function rolesEspace(espace: Espace): Role[] {
  if (espace === "complet") return [...ROLES];
  if (espace === "ferme") return [];
  return [espace];
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
  /*
   * Adresse fermée : même la connexion est refusée. Laisser entrer sur un
   * écran de connexion qui ne mène nulle part serait pire que de refuser —
   * on renvoie vers la racine, qui explique que l'adresse n'est plus en
   * service.
   */
  if (espace === "ferme") return chemin === "/";
  if (CHEMINS_PUBLICS.includes(chemin)) return true;
  const prefixe = ACCUEIL_PAR_ROLE[espace];
  return chemin === prefixe || chemin.startsWith(`${prefixe}/`);
}

/** Où renvoyer quelqu'un qui a ouvert un écran d'un autre espace. */
export function cheminRefus(espace: Espace): string {
  if (espace === "complet" || espace === "ferme") return "/";
  return "/connexion";
}

/** Adresse d'entrée de l'espace, utilisée par le manifeste de l'application. */
export function accueilEspace(espace: Espace): string {
  if (espace === "complet" || espace === "ferme") return "/";
  return ACCUEIL_PAR_ROLE[espace];
}

/* Textes propres à chaque espace. Ils sont écrits pour la personne qui les lit,
   en français simple, sans terme technique. */

export function nomEspace(espace: Espace): string {
  switch (espace) {
    case "agent":
      return "Siira, espace agent de santé";
    case "centre":
      return "Siira, espace centre spécialisé";
    case "ferme":
      return "Adresse hors service — Siira";
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
    case "ferme":
      return "Cette adresse n’est plus en service";
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
    case "ferme":
      return "L’espace qui se trouvait ici a été retiré. Rapprochez-vous de l’équipe Siira pour obtenir la bonne adresse.";
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
    default:
      return null;
  }
}

/** Comptes de démonstration proposés sur cette adresse. */
export function comptesDeLespace(espace: Espace, profils: Profil[]): Profil[] {
  const roles = rolesEspace(espace);
  return profils.filter((p) => roles.includes(p.role));
}
