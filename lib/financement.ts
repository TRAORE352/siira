// Financement par les ONG (section 6.3 du cahier des charges).
// Logique déterministe : calcul du montant demandé et correspondance avec les
// règles de financement des ONG.

import type { CapacitePaiement, RegleFinancement, Soin, Tarif } from "./types";

/** Soins inclus dans la demande selon le niveau. */
export const SOINS_PAR_NIVEAU: Record<"orange" | "rouge", Soin[]> = {
  orange: ["consultation", "echographie", "transport"],
  rouge: ["consultation", "echographie", "biopsie", "transport"],
};

/**
 * Montant demandé = somme des tarifs des soins nécessaires, lus dans la table
 * tarifs du centre choisi.
 */
export function montantDemande(
  niveau: "orange" | "rouge",
  tarifsCentre: Tarif[],
): number {
  const soins = SOINS_PAR_NIVEAU[niveau];
  return soins.reduce((total, soin) => {
    const tarif = tarifsCentre.find((t) => t.soin === soin);
    return total + (tarif ? tarif.montant : 0);
  }, 0);
}

/**
 * Contribution de l'ONG : le montant total si la patiente ne peut pas payer,
 * la moitié si elle peut payer en partie. (Si elle peut payer en totalité,
 * aucune demande de financement n'est créée — voir `regleCorrespond`.)
 */
export function contributionOng(
  capacitePaiement: CapacitePaiement,
  montant: number,
): number {
  return capacitePaiement === "partielle" ? Math.ceil(montant / 2) : montant;
}

export interface ContextePatiente {
  districtId: string;
  niveau: "orange" | "rouge";
  capacitePaiement: CapacitePaiement;
}

/**
 * Une règle de financement correspond à un cas si TOUTES les conditions sont
 * vraies (section 6.3) :
 *  - la règle est active ;
 *  - le district de la patiente fait partie des districts de la règle ;
 *  - le niveau validé fait partie des niveaux de la règle ;
 *  - la situation financière fait partie des situations couvertes ;
 *  - le budget restant couvre la contribution demandée.
 * Une patiente qui peut payer n'a droit à aucun financement.
 */
export function regleCorrespond(
  regle: RegleFinancement,
  patiente: ContextePatiente,
  budgetRestant: number,
  montant: number,
): boolean {
  if (!regle.active) return false;
  if (patiente.capacitePaiement === "peut_payer") return false;
  if (!regle.districts.includes(patiente.districtId)) return false;
  if (!regle.niveaux.includes(patiente.niveau)) return false;
  if (!regle.situations.includes(patiente.capacitePaiement)) return false;

  const contribution = contributionOng(patiente.capacitePaiement, montant);
  return budgetRestant >= contribution;
}

/** ONG (règles + budget) qui correspondent au cas, avec la contribution prévue. */
export interface OngFinanceur {
  regle: RegleFinancement;
  montant: number;
  contribution: number;
}

export function ongsCorrespondants(
  regles: RegleFinancement[],
  patiente: ContextePatiente,
  montant: number,
  budgetParOng: (ongId: string) => number,
): OngFinanceur[] {
  const resultat: OngFinanceur[] = [];
  for (const regle of regles) {
    const budget = budgetParOng(regle.ongId);
    if (regleCorrespond(regle, patiente, budget, montant)) {
      resultat.push({
        regle,
        montant,
        contribution: contributionOng(patiente.capacitePaiement, montant),
      });
    }
  }
  return resultat;
}
