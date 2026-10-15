// Modèle de données (section 10 du cahier des charges).
// Chaque table a une clé `id` (uuid) et un champ `cree_le` (non répétés ici).

export type Role = "agent" | "centre" | "ong" | "admin";

export type Niveau = "vert" | "orange" | "rouge";

export type CapacitePaiement = "peut_payer" | "partielle" | "ne_peut_pas";

export type StatutConsultation =
  | "brouillon"
  | "analysee"
  | "validee"
  | "close";

export type StatutOrientation =
  | "brouillon"
  | "envoyee"
  | "recue"
  | "examens"
  | "resultat"
  | "close"
  | "absente";

export type StatutFinancement =
  | "proposee"
  | "confirmee"
  | "refusee"
  | "retiree";

export type EtapeSuivi = "recue" | "examens" | "resultat" | "absente";

export type ResultatSuivi =
  | "en_attente"
  | "benin"
  | "a_surveiller"
  | "cancer_confirme";

// --- Fiche structurée (section 8.2) ---
// Toute valeur absente du récit vaut null ; le modèle ne devine jamais.

export type Sein = "gauche" | "droit" | "les_deux";
export type Douleur = "aucune" | "localisee" | "deux_seins_cyclique";
export type SignePeau = "retraction" | "peau_orange" | "ulceration" | "rougeur";
export type Ecoulement = "aucun" | "sanglant" | "non_sanglant";

export interface FicheStructuree {
  sein: Sein | null;
  masse: boolean | null;
  masse_dure: boolean | null;
  masse_fixe: boolean | null;
  duree_semaines: number | null;
  douleur: Douleur | null;
  peau: SignePeau[];
  mamelon_retraction_recente: boolean | null;
  ecoulement: Ecoulement | null;
  ecoulement_un_cote: boolean | null;
  ganglion_aisselle: boolean | null;
  antecedents_familiaux: boolean | null;
  autres: string | null;
}

// --- Référentiels ---

export interface District {
  id: string;
  nom: string;
  latitude: number;
  longitude: number;
}

export type Examen = "echographie" | "mammographie" | "biopsie";

export interface Centre {
  id: string;
  nom: string;
  service?: string;
  latitude: number;
  longitude: number;
  examens: Examen[];
  placesSemaine: number;
  actif: boolean;
}

export interface Creneau {
  id: string;
  centreId: string;
  debut: string; // ISO 8601
  libre: boolean;
}

export type Soin = "consultation" | "echographie" | "biopsie" | "transport";

export interface Tarif {
  centreId: string;
  soin: Soin;
  montant: number; // FCFA
}

// --- Données métier ---

export interface Profil {
  userId: string;
  nom: string;
  role: Role;
  centreSante?: string;
  centreId?: string;
  ongId?: string;
}

export interface Patiente {
  id: string;
  agentId: string;
  nom: string;
  age: number;
  districtId: string;
  village?: string;
  telephone?: string;
  capacitePaiement: CapacitePaiement;
  consentement: boolean;
  code: string; // identifiant anonyme, ex. « Cas 0412 »
}

export interface Consultation {
  id: string;
  patienteId: string;
  agentId: string;
  recit: string;
  fiche: FicheStructuree | null;
  niveauPropose: Niveau | null;
  reglesDeclenchees: string[];
  explication: string | null;
  niveauValide: Niveau | null;
  raisonCorrection: string | null;
  commentaireCorrection: string | null;
  statut: StatutConsultation;
}

export interface Orientation {
  id: string;
  consultationId: string;
  centreId: string;
  creneauId: string | null;
  score: number;
  resumeIa: string | null;
  statut: StatutOrientation;
  envoyeeLe: string | null;
}

export interface Ong {
  id: string;
  nom: string;
  budgetTotal: number;
  budgetRestant: number;
}

export interface RegleFinancement {
  id: string;
  ongId: string;
  districts: string[];
  niveaux: Niveau[];
  situations: CapacitePaiement[];
  active: boolean;
}

export interface Financement {
  id: string;
  orientationId: string;
  ongId: string;
  montant: number;
  statut: StatutFinancement;
  raisonRefus: string | null;
}

export interface Suivi {
  id: string;
  orientationId: string;
  etape: EtapeSuivi;
  resultat: ResultatSuivi;
  note: string | null;
  auteurId: string;
}

// --- Vue cas_anonymes (source de données des ONG, section 10) ---

export interface CasAnonyme {
  code: string;
  age: number;
  district: string;
  niveau: Niveau;
  capacitePaiement: CapacitePaiement;
  centre: string;
  soins: Soin[];
  montant: number;
  statutFinancement: StatutFinancement;
  statutOrientation: StatutOrientation;
  resultat: ResultatSuivi | null;
}
