"use client";

/**
 * Libellés affichés à l'écran.
 * Aucun terme technique ne doit apparaître dans l'interface.
 */

import type {
  CapacitePaiement,
  Douleur,
  Ecoulement,
  EtapeSuivi,
  Niveau,
  Orientation,
  ResultatSuivi,
  Sein,
  SignePeau,
  StatutFinancement,
} from "./types";

export const LIBELLE_PAIEMENT: Record<CapacitePaiement, string> = {
  peut_payer: "Elle peut payer",
  partielle: "Elle peut payer une partie",
  ne_peut_pas: "Elle ne peut pas payer",
};

export const LIBELLE_SEIN: Record<Sein, string> = {
  gauche: "Sein gauche",
  droit: "Sein droit",
  les_deux: "Les deux seins",
};

export const LIBELLE_DOULEUR: Record<Douleur, string> = {
  aucune: "Pas de douleur",
  localisee: "Douleur à un endroit précis",
  deux_seins_cyclique: "Douleur des deux seins avant les règles",
};

export const LIBELLE_PEAU: Record<SignePeau, string> = {
  retraction: "Peau tirée vers l'intérieur",
  peau_orange: "Peau en peau d'orange",
  ulceration: "Plaie ouverte",
  rougeur: "Rougeur",
};

export const LIBELLE_ECOULEMENT: Record<Ecoulement, string> = {
  aucun: "Pas d'écoulement",
  sanglant: "Écoulement avec du sang",
  non_sanglant: "Écoulement sans sang",
};

export const LIBELLE_ETAPE: Record<EtapeSuivi, string> = {
  recue: "Patiente reçue",
  examens: "Examens faits",
  resultat: "Résultat disponible",
  absente: "Patiente non venue",
};

export const LIBELLE_RESULTAT: Record<ResultatSuivi, string> = {
  en_attente: "Résultat en attente",
  benin: "Sans gravité",
  a_surveiller: "À surveiller",
  cancer_confirme: "Cancer confirmé",
};

/** État du dossier, dit simplement, du point de vue de l'agent. */
export const LIBELLE_STATUT_ORIENTATION: Record<Orientation["statut"], string> = {
  brouillon: "Dossier non envoyé",
  envoyee: "Dossier envoyé au centre",
  recue: "Patiente reçue au centre",
  examens: "Examens en cours",
  resultat: "Résultat disponible",
  close: "Suivi terminé",
  absente: "Patiente non venue au rendez-vous",
};

/**
 * État d'une demande de prise en charge.
 * L'accord des partenaires se traite hors de l'application : ces libellés
 * décrivent uniquement où en est la demande, pas une action à faire ici.
 */
export const LIBELLE_STATUT_FINANCEMENT: Record<StatutFinancement, string> = {
  proposee: "À demander",
  confirmee: "Accordée",
  refusee: "Refusée",
  retiree: "Retirée",
};

export const RAISONS_CORRECTION = [
  "Examen clinique différent",
  "Information manquante dans le récit",
  "Autre",
];

/** Conseils donnés à l'agent pour un cas vert. */
export const CONSEILS_VERT = [
  "Expliquez à la patiente qu'aucun signe inquiétant n'a été relevé aujourd'hui.",
  "Montrez-lui comment observer ses seins une fois par mois, après les règles.",
  "Dites-lui de revenir sans attendre si une boule apparaît, si la peau change, ou s'il y a un écoulement.",
  "Proposez un contrôle dans trois mois.",
];

/** Date lisible, par exemple « lundi 20 octobre à 08:00 ». */
export function dateLisible(iso: string): string {
  const d = new Date(iso);
  const jour = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${jour} à ${heure}`;
}

/** Date courte, par exemple « 20 oct. 08:00 ». */
export function dateCourte(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ${d.toLocaleTimeString(
    "fr-FR",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

/**
 * Il y a combien de temps, dit simplement.
 *
 * Le singulier est écrit en clair : « il y a 1 semaines » se voyait sur
 * l'accueil de l'agent, pour toute consultation vieille de 7 à 13 jours.
 */
export function depuis(iso: string): string {
  const jours = joursDepuis(iso);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 7) return `il y a ${jours} jours`;
  if (jours < 31) {
    const semaines = Math.floor(jours / 7);
    return `il y a ${semaines} ${semaines > 1 ? "semaines" : "semaine"}`;
  }
  return `il y a ${Math.floor(jours / 30)} mois`;
}

/**
 * Même chose, en plus court, pour les listes étroites.
 *
 * Sur un écran de 360 px, la ligne de la carte ne fait que 238 px : « il y a
 * 3 semaines » y prenait la moitié et coupait l'état du dossier. La forme
 * courte laisse la place à l'information qui compte, sans changer la façon
 * de compter.
 */
export function depuisCourt(iso: string): string {
  const jours = joursDepuis(iso);
  if (jours <= 0) return "auj.";
  if (jours === 1) return "hier";
  if (jours < 7) return `${jours} j`;
  if (jours < 31) return `${Math.floor(jours / 7)} sem.`;
  return `${Math.floor(jours / 30)} mois`;
}

function joursDepuis(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export const DELAI_NIVEAU: Record<Niveau, string> = {
  rouge: "Voir un spécialiste dans les 7 jours",
  orange: "Voir un spécialiste dans les 30 jours",
  vert: "Revoir la patiente dans 3 mois",
};
