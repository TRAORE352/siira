// Matching avec un centre spécialisé (section 6.2 du cahier des charges).
// Ne s'applique qu'aux niveaux orange et rouge. Formule :
//   score = 50 × proximité + 35 × rapidité + 15 × capacité
// Toute modification de la formule se fait UNIQUEMENT dans ce fichier.

import type { Centre, Creneau } from "./types";

/** Délai limite (en jours) à compter du jour de la consultation. */
export const DELAI_LIMITE_JOURS = {
  rouge: 7,
  orange: 30,
} as const;

/** Examens requis selon le niveau. */
export const EXAMENS_REQUIS = {
  rouge: ["echographie", "biopsie"],
  orange: ["echographie"],
} as const;

export type NiveauMatching = "rouge" | "orange";

/** Distance à vol d'oiseau (formule de Haversine), en kilomètres. */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface CentreAvecCreneaux extends Centre {
  creneaux: Creneau[];
}

export interface CentreScore {
  centre: CentreAvecCreneaux;
  score: number;
  distanceKm: number;
  prochainCreneau: Creneau | null;
  joursAvantCreneau: number | null;
}

export interface ResultatMatching {
  /** Meilleur centre retenu (null si aucun centre actif n'a de créneau libre). */
  meilleur: CentreScore | null;
  /** Centres retenus, triés par score décroissant (égalité → plus proche). */
  tous: CentreScore[];
  /** Vrai si aucun centre ne respecte le délai : proposer le plus proche hors délai. */
  aucunCentreDansLeDelai: boolean;
  /** Centre de secours (le plus proche, sans contrainte de délai). */
  secours: CentreScore | null;
}

function joursEntre(debut: Date, fin: Date): number {
  return (fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24);
}

/** Premier créneau libre d'un centre, par ordre chronologique. */
function prochainCreneauLibre(centre: CentreAvecCreneaux): Creneau | null {
  const libres = centre.creneaux
    .filter((c) => c.libre)
    .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
  return libres[0] ?? null;
}

export function calculerMatching(
  centres: CentreAvecCreneaux[],
  patiente: { latitude: number; longitude: number },
  niveau: NiveauMatching,
  maintenant: Date,
): ResultatMatching {
  const delai = DELAI_LIMITE_JOURS[niveau];
  const examens = EXAMENS_REQUIS[niveau];
  const dateLimite = new Date(maintenant.getTime() + delai * 24 * 3600 * 1000);

  const retenus: CentreScore[] = [];

  for (const centre of centres) {
    // Étape 1 : filtrer.
    if (!centre.actif) continue;
    const aTousLesExamens = examens.every((e) => centre.examens.includes(e));
    if (!aTousLesExamens) continue;

    const prochain = prochainCreneauLibre(centre);
    if (!prochain) continue; // aucune place libre
    if (new Date(prochain.debut).getTime() > dateLimite.getTime()) continue; // hors délai

    // Étape 2 : calculer le score.
    const d = distanceKm(
      patiente.latitude,
      patiente.longitude,
      centre.latitude,
      centre.longitude,
    );
    const proximite = Math.max(0, 1 - d / 300);

    const joursAvant = Math.max(0, joursEntre(maintenant, new Date(prochain.debut)));
    const rapidite = Math.max(0, 1 - joursAvant / delai);

    const placesLibresSemaine = centre.creneaux.filter(
      (c) => c.libre && joursEntre(maintenant, new Date(c.debut)) <= 7,
    ).length;
    const capacite =
      centre.placesSemaine > 0
        ? Math.min(1, placesLibresSemaine / centre.placesSemaine)
        : 0;

    const score = 50 * proximite + 35 * rapidite + 15 * capacite;

    retenus.push({
      centre,
      score,
      distanceKm: d,
      prochainCreneau: prochain,
      joursAvantCreneau: joursAvant,
    });
  }

  retenus.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

  if (retenus.length > 0) {
    return {
      meilleur: retenus[0],
      tous: retenus,
      aucunCentreDansLeDelai: false,
      secours: null,
    };
  }

  // Aucun centre dans le délai : proposer le plus proche, sans contrainte,
  // avec la mention « Hors délai recommandé ».
  const secours = centres
    .filter((c) => c.actif)
    .map((centre) => {
      const prochain = prochainCreneauLibre(centre);
      if (!prochain) return null;
      const d = distanceKm(
        patiente.latitude,
        patiente.longitude,
        centre.latitude,
        centre.longitude,
      );
      return {
        centre,
        score: 0,
        distanceKm: d,
        prochainCreneau: prochain,
        joursAvantCreneau: Math.max(0, joursEntre(maintenant, new Date(prochain.debut))),
      } satisfies CentreScore;
    })
    .filter((x): x is CentreScore => x !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return {
    meilleur: null,
    tous: [],
    aucunCentreDansLeDelai: true,
    secours: secours ?? null,
  };
}
