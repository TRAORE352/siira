/**
 * Choix du centre specialise (matching).
 *
 * FICHIER UNIQUE. La formule de score et les filtres vivent ici et nulle part
 * ailleurs. S'applique uniquement aux niveaux orange et rouge.
 */

import type { Centre, Creneau, District, Examen, Niveau } from "./types";
import { DELAIS_JOURS } from "./regles";

/** Examens exiges pour pouvoir prendre en charge ce niveau. */
export const EXAMENS_REQUIS: Record<"orange" | "rouge", Examen[]> = {
  orange: ["echographie"],
  rouge: ["echographie", "biopsie"],
};

const RAYON_TERRE_KM = 6371;
/** Distance au-dela de laquelle la proximite ne rapporte plus rien. */
const DISTANCE_MAX_KM = 300;

/** Distance a vol d'oiseau entre deux points, en kilometres (haversine). */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nombre de jours entiers entre deux dates. */
export function joursEntre(debut: Date, fin: Date): number {
  const jour = 24 * 60 * 60 * 1000;
  const d0 = Date.UTC(debut.getFullYear(), debut.getMonth(), debut.getDate());
  const d1 = Date.UTC(fin.getFullYear(), fin.getMonth(), fin.getDate());
  return Math.round((d1 - d0) / jour);
}

export interface PropositionCentre {
  centre: Centre;
  creneau: Creneau;
  distance_km: number;
  jours_attente: number;
  score: number;
  /** Vrai quand le centre est propose faute de mieux, au-dela du delai. */
  hors_delai: boolean;
  detail: { proximite: number; rapidite: number; capacite: number };
}

export interface ResultatMatching {
  /** Meilleure proposition, ou null si aucun centre n'existe du tout. */
  proposition: PropositionCentre | null;
  /** Toutes les propositions retenues, triees par score decroissant. */
  alternatives: PropositionCentre[];
  /** Vrai quand aucun centre ne tient le delai recommande. */
  aucun_dans_le_delai: boolean;
}

export interface EntreeMatching {
  niveau: Exclude<Niveau, "vert">;
  district: District;
  centres: Centre[];
  creneaux: Creneau[];
  /** Jour de la consultation. */
  aujourdhui: Date;
}

/** Premier creneau libre d'un centre, a partir d'aujourd'hui. */
function premierCreneauLibre(
  centreId: string,
  creneaux: Creneau[],
  aujourdhui: Date,
): Creneau | null {
  const libres = creneaux
    .filter(
      (c) =>
        c.centre_id === centreId &&
        c.libre &&
        new Date(c.debut).getTime() >= aujourdhui.getTime(),
    )
    .sort((a, b) => a.debut.localeCompare(b.debut));
  return libres[0] ?? null;
}

/** Places encore libres cette semaine, pour la part capacite du score. */
function placesLibresSemaine(
  centreId: string,
  creneaux: Creneau[],
  aujourdhui: Date,
): number {
  const fin = new Date(aujourdhui.getTime() + 7 * 24 * 60 * 60 * 1000);
  return creneaux.filter(
    (c) =>
      c.centre_id === centreId &&
      c.libre &&
      new Date(c.debut) >= aujourdhui &&
      new Date(c.debut) < fin,
  ).length;
}

function construire(
  centre: Centre,
  creneau: Creneau,
  district: District,
  creneaux: Creneau[],
  aujourdhui: Date,
  delaiLimite: number,
): PropositionCentre {
  const distance = distanceKm(district, centre);
  const attente = joursEntre(aujourdhui, new Date(creneau.debut));

  const proximite = Math.max(0, 1 - distance / DISTANCE_MAX_KM);
  const rapidite = Math.max(0, Math.min(1, 1 - attente / delaiLimite));
  const places = placesLibresSemaine(centre.id, creneaux, aujourdhui);
  const capacite =
    centre.places_semaine > 0
      ? Math.max(0, Math.min(1, places / centre.places_semaine))
      : 0;

  const score = 50 * proximite + 35 * rapidite + 15 * capacite;

  return {
    centre,
    creneau,
    distance_km: Math.round(distance * 10) / 10,
    jours_attente: attente,
    score: Math.round(score * 10) / 10,
    hors_delai: attente > delaiLimite,
    detail: {
      proximite: Math.round(proximite * 100) / 100,
      rapidite: Math.round(rapidite * 100) / 100,
      capacite: Math.round(capacite * 100) / 100,
    },
  };
}

/**
 * Choisit le centre le plus adapte.
 *
 * Etape 1 : garder les centres actifs, qui proposent les examens requis et qui
 * ont un creneau libre avant la date limite.
 * Etape 2 : noter de 0 a 100.
 * Etape 3 : proposer le meilleur score ; a egalite, le plus proche.
 */
export function choisirCentre(entree: EntreeMatching): ResultatMatching {
  const { niveau, district, centres, creneaux, aujourdhui } = entree;
  const requis = EXAMENS_REQUIS[niveau];
  const delaiLimite = DELAIS_JOURS[niveau];

  const eligibles = centres.filter(
    (c) => c.actif && requis.every((ex) => c.examens.includes(ex)),
  );

  const retenus: PropositionCentre[] = [];
  const horsDelai: PropositionCentre[] = [];

  for (const centre of eligibles) {
    const creneau = premierCreneauLibre(centre.id, creneaux, aujourdhui);
    if (!creneau) continue;
    const p = construire(centre, creneau, district, creneaux, aujourdhui, delaiLimite);
    if (p.hors_delai) horsDelai.push(p);
    else retenus.push(p);
  }

  const trier = (a: PropositionCentre, b: PropositionCentre) =>
    b.score - a.score || a.distance_km - b.distance_km;

  retenus.sort(trier);

  if (retenus.length > 0) {
    return {
      proposition: retenus[0],
      alternatives: retenus,
      aucun_dans_le_delai: false,
    };
  }

  // Aucun centre dans le delai : proposer le plus proche sans contrainte.
  horsDelai.sort((a, b) => a.distance_km - b.distance_km || a.jours_attente - b.jours_attente);
  return {
    proposition: horsDelai[0] ?? null,
    alternatives: horsDelai,
    aucun_dans_le_delai: true,
  };
}
