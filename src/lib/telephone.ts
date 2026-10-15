/**
 * Numéro de téléphone burkinabè.
 *
 * Le Burkina Faso utilise des numéros à 8 chiffres depuis la migration de 2021.
 * Les mobiles commencent par 0 (01, 02 et 03 pour Moov Africa et Telecel,
 * 05, 06 et 07 pour Orange). Les anciens numéros à 8 chiffres commençant par
 * 5, 6 ou 7 circulent encore sur les cartes de visite et dans les carnets des
 * agents : on les accepte, et on les affiche tels quels.
 *
 * Phase 1 : aucun serveur ne vérifie le numéro. La validation ci-dessous sert
 * à écarter une faute de frappe, pas à authentifier quelqu'un. Phase 2 : le
 * numéro deviendra l'identifiant du compte côté Supabase.
 */

/** Indicatif national, affiché séparément du numéro. */
export const INDICATIF = "+226";

/** Nombre de chiffres d'un numéro burkinabè, indicatif non compris. */
export const LONGUEUR_NUMERO = 8;

/** Nombre de chiffres du code secret. */
export const LONGUEUR_CODE = 6;

/**
 * Ne garde que les chiffres, et retire l'indicatif s'il a été saisi.
 * Accepte « +226 70 12 34 56 », « 00226-70.12.34.56 » et « 70123456 ».
 */
export function chiffresSeuls(saisie: string): string {
  let n = saisie.replace(/\D/g, "");
  if (n.startsWith("00226")) n = n.slice(5);
  else if (n.startsWith("226") && n.length > LONGUEUR_NUMERO) n = n.slice(3);
  return n.slice(0, LONGUEUR_NUMERO);
}

/**
 * Affichage par groupes de deux : « 70 12 34 56 ».
 * C'est ainsi que les numéros sont lus et dictés au Burkina Faso.
 */
export function formaterNumero(saisie: string): string {
  const n = chiffresSeuls(saisie);
  return n.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

/** Les deux premiers chiffres désignent-ils un mobile burkinabè ?
 *
 * Sert uniquement à des fins d'affichage ou de statistiques : cette fonction
 * ne doit JAMAIS servir à refuser une saisie (voir `erreurNumero`).
 */
export function ressembleAMobile(saisie: string): boolean {
  const n = chiffresSeuls(saisie);
  if (n.length < LONGUEUR_NUMERO) return false;
  const tete = n[0];
  if (tete === "5" || tete === "6" || tete === "7") return true;
  if (tete === "0") return ["1", "2", "3", "5", "6", "7"].includes(n[1]);
  return false;
}

/**
 * Message d'erreur en français simple, ou `null` si le numéro convient.
 *
 * On ne contrôle QUE la longueur.
 *
 * La tentation est grande de refuser les préfixes « inconnus ». C'est une
 * faute : le plan de numérotation burkinabè a changé en 2021, il comporte des
 * lignes fixes (20 à Bobo-Dioulasso, 25 à Ouagadougou) autant que des mobiles,
 * et les opérateurs ouvrent de nouvelles tranches sans prévenir. Une liste de
 * préfixes écrite ici vieillit mal et finit par bloquer de vraies personnes
 * devant leur propre numéro — une faute bien plus grave que de laisser passer
 * une saisie farfelue, que le serveur rejettera de toute façon en Phase 2.
 */
export function erreurNumero(saisie: string): string | null {
  const n = chiffresSeuls(saisie);
  if (n.length === 0) return "Entrez votre numéro de téléphone.";
  if (n.length < LONGUEUR_NUMERO) {
    const reste = LONGUEUR_NUMERO - n.length;
    return reste === 1
      ? "Il manque un chiffre à ce numéro."
      : `Il manque ${reste} chiffres à ce numéro.`;
  }
  return null;
}

export function numeroValide(saisie: string): boolean {
  return erreurNumero(saisie) === null;
}

/** Message d'erreur sur le code secret, ou `null` s'il convient. */
export function erreurCode(code: string): string | null {
  const c = code.replace(/\D/g, "");
  if (c.length === 0) return "Entrez votre code à 6 chiffres.";
  if (c.length < LONGUEUR_CODE) return "Votre code compte 6 chiffres.";
  return null;
}

export function codeValide(code: string): boolean {
  return erreurCode(code) === null;
}

/** Forme stable d'un numéro, pour l'enregistrer : « +22670123456 ». */
export function numeroCanonique(saisie: string): string {
  return `${INDICATIF}${chiffresSeuls(saisie)}`;
}

/** Forme lisible d'un numéro enregistré : « +226 70 12 34 56 ». */
export function numeroLisible(canonique: string): string {
  return `${INDICATIF} ${formaterNumero(canonique)}`;
}
