// Libellés français et formatage — partagés entre composants serveur et client.
// (Séparés de lib/centre.ts, qui importe des modules serveur, pour pouvoir être
// importés par des composants client.)

export function formatFCFA(montant: number): string {
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

export const LIBELLE_SOIN: Record<string, string> = {
  consultation: "Consultation spécialisée",
  echographie: "Échographie mammaire",
  biopsie: "Biopsie",
  transport: "Transport",
};

export const LIBELLE_STATUT_ORIENTATION: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Reçu",
  recue: "Reçue",
  examens: "Examens réalisés",
  resultat: "Résultat disponible",
  close: "Clos",
  absente: "Absente",
};

export const LIBELLE_STATUT_FINANCEMENT: Record<string, string> = {
  proposee: "À demander",
  confirmee: "Accordée",
  refusee: "Refusée",
  retiree: "Retirée",
};

export const LIBELLE_RESULTAT: Record<string, string> = {
  en_attente: "En attente",
  benin: "Bénin",
  a_surveiller: "À surveiller",
  cancer_confirme: "Cancer confirmé",
};

export const LIBELLE_ETAPE: Record<string, string> = {
  recue: "Reçue",
  examens: "Examens réalisés",
  resultat: "Résultat disponible",
  absente: "Absente",
};

/** Niveau d'urgence avec libellé (charte : couleur ET mot, exigence 12). */
export const LIBELLE_NIVEAU: Record<string, string> = {
  rouge: "Rouge",
  orange: "Orange",
  vert: "Vert",
};
