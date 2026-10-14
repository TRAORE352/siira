/**
 * Réponses d'intelligence artificielle enregistrées pour la démonstration.
 *
 * En Phase 1, aucune API n'est appelée. Les trois récits de démonstration
 * du dossier (section 14) renvoient la fiche préparée ici. Pour tout autre
 * récit, la fiche s'affiche vide et l'agent la remplit à la main.
 *
 * En Phase 2, ce fichier servira de secours quand DeepSeek ne répond pas.
 */

import type { Fiche } from "./types";
import { ficheVide } from "./regles";

export interface ReponseIa {
  fiche: Fiche;
  /** Phrases rédigées pour l'agent, affichées sous le niveau. */
  explication: string;
  /** Résumé destiné au spécialiste, 4 lignes au maximum. */
  resume: string;
}

interface EntreeCache extends ReponseIa {
  /** Mots qui doivent tous figurer dans le récit pour reconnaître le cas. */
  indices: string[];
}

/** Enlève les accents et la ponctuation, pour comparer des récits dictés. */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CACHE: EntreeCache[] = [
  {
    // Awa, 41 ans, Saaba : attendu rouge (R1, R5).
    indices: ["boule", "gauche", "mois", "peau"],
    fiche: {
      ...ficheVide(),
      sein: "gauche",
      masse: true,
      duree_semaines: 8,
      douleur: "aucune",
      peau: ["retraction"],
    },
    explication:
      "Une masse est présente dans le sein gauche depuis environ deux mois, et la peau du sein est tirée à cet endroit. Ces deux signes réunis demandent l'avis d'un spécialiste sans attendre.",
    resume:
      "Patiente de 41 ans, district de Saaba. Masse du sein gauche évoluant depuis 8 semaines, indolore. Rétraction cutanée en regard de la masse. Pas de ganglion axillaire ni d'écoulement rapportés. Orientation demandée pour échographie mammaire et biopsie.",
  },
  {
    // Aminata, 34 ans, Koubri : attendu orange (O1).
    indices: ["boule", "droit", "semaine", "bouge"],
    fiche: {
      ...ficheVide(),
      sein: "droit",
      masse: true,
      masse_dure: false,
      masse_fixe: false,
      duree_semaines: 1,
      douleur: "aucune",
    },
    explication:
      "Une masse mobile est présente dans le sein droit depuis une semaine. Elle ne présente pas de signe d'alerte immédiat, mais elle doit être examinée par un spécialiste dans le mois.",
    resume:
      "Patiente de 34 ans, district de Koubri. Masse du sein droit apparue depuis 1 semaine, mobile sous les doigts, indolore. Pas de signe cutané, pas de ganglion, pas d'écoulement. Orientation demandée pour échographie mammaire.",
  },
  {
    // Fatou, 28 ans, Ziniaré : attendu vert (V1).
    indices: ["mal", "deux seins", "regles"],
    fiche: {
      ...ficheVide(),
      sein: "les_deux",
      masse: false,
      douleur: "deux_seins_cyclique",
    },
    explication:
      "La douleur touche les deux seins et revient avec les règles chaque mois. Aucune masse ni autre signe d'alerte n'est décrit. Une surveillance simple suffit pour le moment.",
    resume:
      "Patiente de 28 ans, district de Ziniaré. Mastodynie bilatérale rythmée par le cycle menstruel. Pas de masse palpée, pas de signe cutané, pas d'écoulement. Pas d'orientation spécialisée nécessaire à ce stade.",
  },
];

/**
 * Cherche une réponse enregistrée pour ce récit.
 * Renvoie null si le récit n'est pas l'un des cas de démonstration.
 */
export function chercherDansLeCache(recit: string): ReponseIa | null {
  const texte = normaliser(recit);
  for (const entree of CACHE) {
    if (entree.indices.every((mot) => texte.includes(normaliser(mot)))) {
      return {
        fiche: { ...entree.fiche, peau: [...entree.fiche.peau] },
        explication: entree.explication,
        resume: entree.resume,
      };
    }
  }
  return null;
}

/**
 * Explication de repli, construite à partir des règles déclenchées, quand
 * aucun texte rédigé n'est disponible.
 */
export function explicationDeRepli(
  regles: { libelle: string }[],
  delai: string,
): string {
  if (regles.length === 0) return delai + ".";
  const liste = regles.map((r) => r.libelle.toLowerCase()).join(" ; ");
  return `Ce niveau a été proposé à partir de ce qui a été noté : ${liste}. ${delai}.`;
}

/** Résumé de repli pour le spécialiste, sans intelligence artificielle. */
export function resumeDeRepli(
  age: number,
  district: string,
  regles: { libelle: string }[],
): string {
  const liste = regles.map((r) => r.libelle.toLowerCase()).join(" ; ");
  return `Patiente de ${age} ans, district de ${district}. Éléments relevés par l'agent : ${liste}. Fiche détaillée jointe au dossier.`;
}
