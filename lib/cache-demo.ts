// Cache de démo (section 8.4 du cahier des charges).
// Réponses de secours pour les trois cas de démo. Si l'API DeepSeek ne répond
// pas pendant le pitch, ces réponses sont utilisées à la place.

import type { FicheStructuree, Niveau } from "./types";

export interface CasDemo {
  slug: string;
  recit: string;
  fiche: FicheStructuree;
  niveau: Niveau;
  explication: string;
}

// Awa, 41 ans, Saaba — rouge (R1, R5)
const awa: CasDemo = {
  slug: "awa",
  recit: "Elle a une boule au sein gauche depuis deux mois, ça ne fait pas mal, la peau est un peu tirée.",
  fiche: {
    sein: "gauche",
    masse: true,
    masse_dure: null,
    masse_fixe: null,
    duree_semaines: 8,
    douleur: "aucune",
    peau: ["retraction"],
    mamelon_retraction_recente: null,
    ecoulement: null,
    ecoulement_un_cote: null,
    ganglion_aisselle: null,
    antecedents_familiaux: null,
    autres: null,
  },
  niveau: "rouge",
  explication:
    "Une masse au sein est présente depuis deux mois, avec un signe cutané (peau tirée). Ces signes justifient un avis spécialisé dans les meilleurs délais.",
};

// Aminata, 34 ans, Koubri — orange (O1)
const aminata: CasDemo = {
  slug: "aminata",
  recit: "Elle sent une petite boule au sein droit depuis une semaine, elle bouge sous les doigts.",
  fiche: {
    sein: "droit",
    masse: true,
    masse_dure: null,
    masse_fixe: false,
    duree_semaines: 1,
    douleur: null,
    peau: [],
    mamelon_retraction_recente: null,
    ecoulement: null,
    ecoulement_un_cote: null,
    ganglion_aisselle: null,
    antecedents_familiaux: null,
    autres: null,
  },
  niveau: "orange",
  explication:
    "Une masse est présente, sans signe d'alerte immédiat. Une consultation spécialisée avec échographie est recommandée pour préciser sa nature.",
};

// Fatou, 28 ans, Ziniaré — vert (V1)
const fatou: CasDemo = {
  slug: "fatou",
  recit: "Elle a mal aux deux seins avant ses règles chaque mois, pas de boule.",
  fiche: {
    sein: "les_deux",
    masse: false,
    masse_dure: null,
    masse_fixe: null,
    duree_semaines: null,
    douleur: "deux_seins_cyclique",
    peau: [],
    mamelon_retraction_recente: null,
    ecoulement: null,
    ecoulement_un_cote: null,
    ganglion_aisselle: null,
    antecedents_familiaux: null,
    autres: null,
  },
  niveau: "vert",
  explication:
    "Aucun signe d'alerte n'est relevé : la douleur touche les deux seins, sans masse. Une simple surveillance est recommandée, avec un contrôle dans trois mois.",
};

export const CAS_DEMO: CasDemo[] = [awa, aminata, fatou];

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retrouve un cas de démo à partir du récit (correspondance approximative sur
 * les mots principaux). Renvoie null si aucun cas ne correspond.
 */
export function trouverCasDemo(recit: string): CasDemo | null {
  const normalise = normaliser(recit);
  let meilleur: CasDemo | null = null;
  let meilleurScore = 0;

  for (const cas of CAS_DEMO) {
    const mots = normaliser(cas.recit).split(" ");
    const score = mots.filter((m) => m.length >= 3 && normalise.includes(m)).length;
    const ratio = score / mots.length;
    if (ratio > meilleurScore) {
      meilleurScore = ratio;
      meilleur = cas;
    }
  }

  // Seuil : au moins 60 % des mots significatifs du cas de démo sont présents.
  return meilleurScore >= 0.6 ? meilleur : null;
}
