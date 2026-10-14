/**
 * Regles de classement du niveau d'urgence.
 *
 * FICHIER UNIQUE ET VOLONTAIREMENT LISIBLE.
 * Une professionnelle de sante doit pouvoir relire ce tableau sans lire le
 * reste du code. Pour modifier le comportement de Siira, on modifie REGLES
 * ci-dessous, rien d'autre.
 *
 * Methode : chaque regle est testee sur la fiche structuree. Le niveau retenu
 * est le plus eleve parmi les regles declenchees (rouge > orange > vert).
 * Si aucune regle rouge ou orange ne se declenche, le niveau est vert.
 */

import type { Fiche, Niveau } from "./types";

/** Entree lue par les regles : la fiche, plus l'age de la patiente. */
export interface EntreeClassement {
  fiche: Fiche;
  age: number;
}

export interface Regle {
  /** Code court affiche a l'agent, par exemple "R1". */
  code: string;
  /** Phrase lisible par un soignant, affichee telle quelle a l'ecran. */
  libelle: string;
  /** Niveau applique quand la condition est vraie. */
  niveau: Niveau;
  /** Condition. Toutes les parties doivent etre vraies. */
  condition: (e: EntreeClassement) => boolean;
}

/** Signes cutanes qui, associes a une masse, imposent le niveau rouge. */
const SIGNES_PEAU_ALARMANTS = [
  "retraction",
  "peau_orange",
  "ulceration",
  "rougeur",
] as const;

export const REGLES: Regle[] = [
  {
    code: "R1",
    libelle: "Une masse et un signe sur la peau du sein",
    niveau: "rouge",
    condition: ({ fiche }) =>
      fiche.masse === true &&
      fiche.peau.some((s) =>
        (SIGNES_PEAU_ALARMANTS as readonly string[]).includes(s),
      ),
  },
  {
    code: "R2",
    libelle: "Une masse et un ganglion sous l'aisselle",
    niveau: "rouge",
    condition: ({ fiche }) =>
      fiche.masse === true && fiche.ganglion_aisselle === true,
  },
  {
    code: "R3",
    libelle: "Un ecoulement avec du sang, d'un seul cote",
    niveau: "rouge",
    condition: ({ fiche }) =>
      fiche.ecoulement === "sanglant" && fiche.ecoulement_un_cote === true,
  },
  {
    code: "R4",
    libelle: "Une masse dure et fixee",
    niveau: "rouge",
    condition: ({ fiche }) =>
      fiche.masse_dure === true && fiche.masse_fixe === true,
  },
  {
    code: "R5",
    libelle: "Une masse depuis 4 semaines ou plus, chez une femme de 30 ans ou plus",
    niveau: "rouge",
    condition: ({ fiche, age }) =>
      fiche.masse === true &&
      fiche.duree_semaines !== null &&
      fiche.duree_semaines >= 4 &&
      age >= 30,
  },
  {
    code: "O1",
    libelle: "Une masse dans le sein",
    niveau: "orange",
    condition: ({ fiche }) => fiche.masse === true,
  },
  {
    code: "O2",
    libelle: "Un mamelon rentre depuis peu",
    niveau: "orange",
    condition: ({ fiche }) => fiche.mamelon_retraction_recente === true,
  },
  {
    code: "O3",
    libelle: "Un ecoulement sans sang, d'un seul cote",
    niveau: "orange",
    condition: ({ fiche }) =>
      fiche.ecoulement === "non_sanglant" && fiche.ecoulement_un_cote === true,
  },
  {
    code: "O4",
    libelle: "Un changement de la peau du sein",
    niveau: "orange",
    condition: ({ fiche }) => fiche.peau.length > 0,
  },
  {
    code: "O5",
    libelle: "Une douleur a un endroit precis depuis 4 semaines ou plus",
    niveau: "orange",
    condition: ({ fiche }) =>
      fiche.douleur === "localisee" &&
      fiche.duree_semaines !== null &&
      fiche.duree_semaines >= 4,
  },
];

/** Regle particuliere : information manquante sur la presence d'une masse. */
export const REGLE_MASSE_INCONNUE = {
  code: "M1",
  libelle: "Presence d'une masse inconnue",
  niveau: "orange" as Niveau,
};

/** Regle par defaut quand rien ne se declenche. */
export const REGLE_VERT = {
  code: "V1",
  libelle: "Aucun signe d'alerte dans ce qui a ete decrit",
  niveau: "vert" as Niveau,
};

/** Delai recommande avant la consultation specialisee, par niveau. */
export const DELAIS_JOURS: Record<Niveau, number> = {
  rouge: 7,
  orange: 30,
  vert: 90,
};

export const DELAI_TEXTE: Record<Niveau, string> = {
  rouge: "Voir un specialiste dans les 7 jours",
  orange: "Voir un specialiste dans les 30 jours",
  vert: "Revoir la patiente dans 3 mois",
};

export interface ResultatClassement {
  niveau: Niveau;
  /** Codes des regles declenchees, dans l'ordre du tableau. */
  codes: string[];
  /** Regles declenchees avec leur libelle, pour l'affichage. */
  regles: { code: string; libelle: string; niveau: Niveau }[];
  /** Vrai quand la fiche doit etre completee par l'agent. */
  champ_a_completer: "masse" | null;
  delai_jours: number;
}

const ORDRE: Record<Niveau, number> = { vert: 0, orange: 1, rouge: 2 };

/**
 * Classe un cas. Aucune intelligence artificielle ici : uniquement le tableau
 * REGLES ci-dessus, applique dans l'ordre.
 */
export function classer(entree: EntreeClassement): ResultatClassement {
  const declenchees = REGLES.filter((r) => {
    try {
      return r.condition(entree);
    } catch {
      return false;
    }
  });

  let niveau: Niveau = "vert";
  for (const r of declenchees) {
    if (ORDRE[r.niveau] > ORDRE[niveau]) niveau = r.niveau;
  }

  const regles = declenchees.map((r) => ({
    code: r.code,
    libelle: r.libelle,
    niveau: r.niveau,
  }));

  // Information manquante : le niveau ne peut pas etre vert.
  let champ_a_completer: "masse" | null = null;
  if (entree.fiche.masse === null) {
    champ_a_completer = "masse";
    if (ORDRE[niveau] < ORDRE.orange) {
      niveau = "orange";
      regles.unshift({ ...REGLE_MASSE_INCONNUE });
    }
  }

  if (regles.length === 0) {
    regles.push({ ...REGLE_VERT });
  }

  return {
    niveau,
    codes: regles.map((r) => r.code),
    regles,
    champ_a_completer,
    delai_jours: DELAIS_JOURS[niveau],
  };
}

/** Fiche vide, utilisee quand l'agent remplit a la main. */
export function ficheVide(): Fiche {
  return {
    sein: null,
    masse: null,
    masse_dure: null,
    masse_fixe: null,
    duree_semaines: null,
    douleur: null,
    peau: [],
    mamelon_retraction_recente: null,
    ecoulement: null,
    ecoulement_un_cote: null,
    ganglion_aisselle: null,
    antecedents_familiaux: null,
    autres: null,
  };
}
