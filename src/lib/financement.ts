/**
 * Financement des soins par les ONG.
 *
 * FICHIER UNIQUE. Montant demande, correspondance avec les regles d'une ONG,
 * et attribution du cas a la premiere ONG qui accepte.
 */

import type {
  CapacitePaiement,
  Niveau,
  Ong,
  RegleFinancement,
  Soin,
  Tarif,
} from "./types";

/** Soins demandes selon le niveau d'urgence. */
export const SOINS_PAR_NIVEAU: Record<"orange" | "rouge", Soin[]> = {
  orange: ["consultation", "echographie", "transport"],
  rouge: ["consultation", "echographie", "biopsie", "transport"],
};

export const LIBELLE_SOIN: Record<Soin, string> = {
  consultation: "Consultation specialisee",
  echographie: "Echographie mammaire",
  biopsie: "Biopsie",
  transport: "Transport",
};

/** Part du cout prise en charge selon ce que la patiente peut payer. */
const PART_A_FINANCER: Record<CapacitePaiement, number> = {
  peut_payer: 0,
  partielle: 0.5,
  ne_peut_pas: 1,
};

export interface MontantDemande {
  soins: Soin[];
  /** Detail ligne par ligne, avant application de la part. */
  lignes: { soin: Soin; montant: number }[];
  cout_total: number;
  /** Montant reellement demande aux ONG, en FCFA. */
  montant: number;
}

/**
 * Calcule le montant demande pour un cas.
 * Renvoie null quand la patiente peut payer : aucune demande n'est creee.
 */
export function calculerMontant(
  niveau: Exclude<Niveau, "vert">,
  capacite: CapacitePaiement,
  centreId: string,
  tarifs: Tarif[],
): MontantDemande | null {
  const part = PART_A_FINANCER[capacite];
  if (part === 0) return null;

  const soins = SOINS_PAR_NIVEAU[niveau];
  const lignes = soins.map((soin) => ({
    soin,
    montant:
      tarifs.find((t) => t.centre_id === centreId && t.soin === soin)?.montant ?? 0,
  }));
  const cout_total = lignes.reduce((s, l) => s + l.montant, 0);

  return {
    soins,
    lignes,
    cout_total,
    // Arrondi aux 100 FCFA superieurs : on ne demande pas des centimes.
    montant: Math.ceil((cout_total * part) / 100) * 100,
  };
}

export interface CasAFinancer {
  district_id: string;
  niveau: Exclude<Niveau, "vert">;
  capacite_paiement: CapacitePaiement;
  montant: number;
}

/** Une regle correspond-elle a ce cas ? */
export function regleCorrespond(
  regle: RegleFinancement,
  cas: CasAFinancer,
  ong: Ong,
): boolean {
  if (!regle.active) return false;
  if (!regle.districts.includes(cas.district_id)) return false;
  if (!regle.niveaux.includes(cas.niveau)) return false;
  if (!regle.situations.includes(cas.capacite_paiement)) return false;
  if (ong.budget_restant < cas.montant) return false;
  return true;
}

/** Liste des ONG qui peuvent financer ce cas, sans doublon. */
export function ongsCorrespondantes(
  cas: CasAFinancer,
  regles: RegleFinancement[],
  ongs: Ong[],
): Ong[] {
  const retenues = new Map<string, Ong>();
  for (const regle of regles) {
    const ong = ongs.find((o) => o.id === regle.ong_id);
    if (!ong) continue;
    if (retenues.has(ong.id)) continue;
    if (regleCorrespond(regle, cas, ong)) retenues.set(ong.id, ong);
  }
  return Array.from(retenues.values());
}

export class FinancementIndisponible extends Error {
  constructor(public readonly raison: "deja_finance" | "budget_insuffisant" | "introuvable") {
    super(raison);
    this.name = "FinancementIndisponible";
  }
}

/** Formate un montant en FCFA, avec des espaces insecables fins. */
export function formaterFcfa(montant: number): string {
  return `${montant.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} FCFA`;
}
