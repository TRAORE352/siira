/**
 * État de la démonstration, côté navigateur.
 *
 * Phase 1 : toutes les données vivent ici, dans le navigateur. Elles sont
 * conservées d'un écran à l'autre et partagées entre les onglets ouverts,
 * ce qui permet de montrer le temps réel avant la mise en place du serveur.
 *
 * Phase 2 : ce fichier sera remplacé par l'implémentation Supabase, sans
 * modifier les écrans, qui passent tous par lib/data/index.ts.
 */

import type {
  Consultation,
  Creneau,
  Financement,
  Ong,
  Orientation,
  Patiente,
  RegleFinancement,
  Suivi,
} from "../types";
import type { CompteAgent } from "../comptes";
import {
  CENTRES,
  DISTRICTS,
  ONGS,
  PROFILS,
  REGLES_FINANCEMENT,
  TARIFS,
  creneauxDemo,
  creneauxHistorique,
  historiqueDemo,
} from "../demo";

export interface EtatSiira {
  patientes: Patiente[];
  consultations: Consultation[];
  orientations: Orientation[];
  financements: Financement[];
  suivis: Suivi[];
  creneaux: Creneau[];
  ongs: Ong[];
  /** Règles de financement, modifiables par chaque ONG. */
  regles_financement: RegleFinancement[];
  /** Comptes créés à l'inscription d'un agent, avec leur matricule. */
  comptes: CompteAgent[];
  /** Incrémenté à chaque écriture, pour repérer les changements. */
  version: number;
}

const CLE = "siira.demo.v1";
const CANAL = "siira.demo";

/** État de départ de la démonstration. */
export function etatInitial(): EtatSiira {
  const historique = historiqueDemo();
  return {
    patientes: historique.map((h) => h.patiente),
    consultations: historique.map((h) => h.consultation),
    orientations: historique.flatMap((h) => (h.orientation ? [h.orientation] : [])),
    financements: historique.flatMap((h) => (h.financement ? [h.financement] : [])),
    suivis: historique.flatMap((h) => h.suivis ?? []),
    creneaux: [...creneauxDemo(), ...creneauxHistorique()],
    ongs: ONGS.map((o) => ({ ...o })),
    regles_financement: REGLES_FINANCEMENT.map((r) => ({ ...r })),
    comptes: [],
    version: 1,
  };
}

/* ------------------------------------------------------------------ */
/* Magasin                                                             */
/* ------------------------------------------------------------------ */

let etat: EtatSiira | null = null;
const abonnes = new Set<() => void>();
let canal: BroadcastChannel | null = null;
let ecouteStockage = false;

function estNavigateur(): boolean {
  return typeof window !== "undefined";
}

function charger(): EtatSiira {
  if (!estNavigateur()) return etatInitial();
  try {
    const brut = window.localStorage.getItem(CLE);
    if (brut) {
      const lu = JSON.parse(brut) as EtatSiira;
      // Les créneaux sont recalculés à chaque jour pour rester dans le futur.
      if (Array.isArray(lu.patientes) && Array.isArray(lu.creneaux)) {
        if (!Array.isArray(lu.regles_financement)) {
          lu.regles_financement = REGLES_FINANCEMENT.map((r) => ({ ...r }));
        }
        /* État enregistré avant l'inscription : aucun compte, et c'est normal. */
        if (!Array.isArray(lu.comptes)) {
          lu.comptes = [];
        }
        return lu;
      }
    }
  } catch {
    // Donnée illisible : on repart de l'état de départ.
  }
  const neuf = etatInitial();
  ecrireDansLeStockage(neuf);
  return neuf;
}

function ecrireDansLeStockage(e: EtatSiira) {
  if (!estNavigateur()) return;
  try {
    window.localStorage.setItem(CLE, JSON.stringify(e));
  } catch {
    // Stockage plein ou refusé : la démonstration continue en mémoire.
  }
}

function ouvrirCanal() {
  if (!estNavigateur()) return;
  if (!canal && typeof BroadcastChannel !== "undefined") {
    canal = new BroadcastChannel(CANAL);
    canal.onmessage = () => {
      // Un autre onglet a écrit : on relit et on prévient les écrans.
      etat = charger();
      prevenir();
    };
  }
  if (!ecouteStockage) {
    ecouteStockage = true;
    // Secours quand BroadcastChannel n'existe pas.
    window.addEventListener("storage", (ev) => {
      if (ev.key !== CLE) return;
      etat = charger();
      prevenir();
    });
  }
}

function prevenir() {
  abonnes.forEach((a) => a());
}

export function lireEtat(): EtatSiira {
  if (!etat) {
    etat = charger();
    ouvrirCanal();
  }
  return etat;
}

/** Applique une modification, enregistre et prévient tous les onglets. */
export function modifier(action: (e: EtatSiira) => EtatSiira | void): EtatSiira {
  const courant = lireEtat();
  const copie: EtatSiira = JSON.parse(JSON.stringify(courant));
  const retour = action(copie);
  const suivant = (retour ?? copie) as EtatSiira;
  suivant.version = courant.version + 1;
  etat = suivant;
  ecrireDansLeStockage(suivant);
  prevenir();
  canal?.postMessage({ version: suivant.version });
  return suivant;
}

/** Abonnement d'un écran aux changements. Renvoie la fonction de désabonnement. */
export function abonner(ecouteur: () => void): () => void {
  ouvrirCanal();
  abonnes.add(ecouteur);
  return () => {
    abonnes.delete(ecouteur);
  };
}

/** Remet la démonstration à son état de départ, dans tous les onglets. */
export function reinitialiser(): EtatSiira {
  const neuf = etatInitial();
  etat = neuf;
  ecrireDansLeStockage(neuf);
  prevenir();
  canal?.postMessage({ version: neuf.version });
  return neuf;
}

/* ------------------------------------------------------------------ */
/* Référentiels, identiques pour tous                                   */
/* ------------------------------------------------------------------ */

export const REFERENTIELS = {
  districts: DISTRICTS,
  centres: CENTRES,
  tarifs: TARIFS,
  profils: PROFILS,
  regles_financement: REGLES_FINANCEMENT,
};
