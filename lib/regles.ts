// Règles de classement du niveau d'urgence (section 6.1 du cahier des charges).
//
// Ces règles sont volontairement DÉTERMINISTES : l'IA ne décide jamais du
// niveau. Elle comprend le texte et rédige les explications ; le niveau est
// calculé ici, par ces règles, validées par un professionnel de santé.
// Toute modification se fait UNIQUEMENT dans ce fichier.

import type { FicheStructuree, Niveau } from "./types";

export type CodeRegle =
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R5"
  | "O1"
  | "O2"
  | "O3"
  | "O4"
  | "O5"
  | "V1";

export interface ResultatClassement {
  niveau: Niveau;
  regles: CodeRegle[];
  /** Vrai si la présence d'une masse est inconnue : le niveau ne peut pas être vert. */
  masseManquante: boolean;
}

/**
 * Classe une fiche structurée (+ âge) en niveau vert / orange / rouge.
 * Méthode : chaque règle est testée ; le niveau final est le plus élevé parmi
 * les règles déclenchées (rouge > orange > vert).
 */
export function classer(fiche: FicheStructuree, age: number): ResultatClassement {
  const regles: CodeRegle[] = [];
  const masseManquante = fiche.masse === null || fiche.masse === undefined;
  const peau = fiche.peau ?? [];

  // --- Règles rouges (R1 à R5) ---
  // R1 : masse ET au moins un signe cutané (rétraction, peau d'orange, ulcération, rougeur)
  const r1 = fiche.masse === true && peau.length > 0;
  // R2 : masse ET ganglion palpable sous le bras du même côté
  const r2 = fiche.masse === true && fiche.ganglion_aisselle === true;
  // R3 : écoulement de sang par le mamelon, d'un seul côté
  const r3 = fiche.ecoulement === "sanglant" && fiche.ecoulement_un_cote === true;
  // R4 : masse dure ET fixe
  const r4 = fiche.masse_dure === true && fiche.masse_fixe === true;
  // R5 : masse depuis 4 semaines ou plus ET âge de 30 ans ou plus
  const r5 =
    fiche.masse === true &&
    fiche.duree_semaines !== null &&
    fiche.duree_semaines !== undefined &&
    fiche.duree_semaines >= 4 &&
    age >= 30;

  if (r1) regles.push("R1");
  if (r2) regles.push("R2");
  if (r3) regles.push("R3");
  if (r4) regles.push("R4");
  if (r5) regles.push("R5");

  if (regles.length > 0) {
    return { niveau: "rouge", regles, masseManquante };
  }

  // --- Règles orange (O1 à O5) ---
  // O1 : masse présente, quelle que soit la durée, sans signe de règle rouge
  const o1 = fiche.masse === true;
  // O2 : rétraction récente du mamelon, sans masse
  const o2 = fiche.mamelon_retraction_recente === true && fiche.masse === false;
  // O3 : écoulement non sanglant d'un seul côté
  const o3 = fiche.ecoulement === "non_sanglant" && fiche.ecoulement_un_cote === true;
  // O4 : modification de la peau du sein sans masse
  const o4 = peau.length > 0 && fiche.masse === false;
  // O5 : douleur localisée d'un seul côté depuis 4 semaines ou plus
  const o5 =
    fiche.douleur === "localisee" &&
    (fiche.duree_semaines ?? 0) >= 4;

  if (o1) regles.push("O1");
  if (o2) regles.push("O2");
  if (o3) regles.push("O3");
  if (o4) regles.push("O4");
  if (o5) regles.push("O5");

  if (regles.length > 0) {
    return { niveau: "orange", regles, masseManquante };
  }

  // Masse inconnue : le niveau ne peut pas être vert (orange au minimum).
  if (masseManquante) {
    return { niveau: "orange", regles: [], masseManquante: true };
  }

  // --- Vert (V1) : aucun des cas ci-dessus ---
  return { niveau: "vert", regles: ["V1"], masseManquante: false };
}
