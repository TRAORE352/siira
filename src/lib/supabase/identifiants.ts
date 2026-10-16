/**
 * Identifiant interne d'un agent — module SANS secret.
 *
 * L'agent s'identifie par son MATRICULE. Supabase Auth exige un identifiant de
 * type courriel : on en fabrique un, interne, jamais montré, derrière lequel il
 * n'y a aucune boîte.
 *
 * Ce module est volontairement séparé de `auth.ts` et de `serveur.ts` : la
 * route d'inscription (serveur) et les écrans (client) en ont tous deux besoin,
 * et un module partagé sans accès aux secrets évite de tirer le client à clé de
 * service dans le graphe de construction du navigateur.
 */

/** Domaine interne : il n'existe pas, et ne doit jamais recevoir de courrier. */
export const DOMAINE_INTERNE = 'agents.siira.app';

/**
 * Courriel interne d'un matricule. Déterministe : le même matricule, écrit
 * « ag 1042 » ou « AG-1042 », donne toujours le même identifiant — sinon un
 * tiret oublié ouvrirait un second compte.
 */
export function courrielInterne(matricule: string): string {
  const cle = matricule.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${cle.toLowerCase()}@${DOMAINE_INTERNE}`;
}

/** Vrai quand ce courriel est un identifiant interne, pas une vraie adresse. */
export function estCourrielInterne(courriel: string | null | undefined): boolean {
  return Boolean(courriel?.endsWith(`@${DOMAINE_INTERNE}`));
}
