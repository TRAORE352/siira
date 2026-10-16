/**
 * Types du domaine Siira.
 * Vocabulaire en francais, identique a celui du dossier de developpement.
 */

export type Niveau = "vert" | "orange" | "rouge";

export type Sein = "gauche" | "droit" | "les_deux";
export type Douleur = "aucune" | "localisee" | "deux_seins_cyclique";
export type SignePeau = "retraction" | "peau_orange" | "ulceration" | "rougeur";
export type Ecoulement = "aucun" | "sanglant" | "non_sanglant";

/** Fiche structuree extraite du recit. Toute valeur absente vaut null. */
export interface Fiche {
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
  /**
   * Contexte de la patiente. Ces quatre réponses ne décident pas du niveau
   * d'urgence : elles éclairent le spécialiste et évitent de se tromper de
   * chemin (un sein rouge et chaud avec de la fièvre est souvent un abcès,
   * une grossesse change l'examen d'imagerie à demander).
   */
  antecedents_personnels: boolean | null;
  statut_menopause: boolean | null;
  fievre: boolean | null;
  grossesse_ou_allaitement: boolean | null;
  /** Est-elle à jour de son examen de dépistage, vu son âge ? */
  depistage_a_jour: boolean | null;
  antecedents_familiaux: boolean | null;
  autres: string | null;
}

export type Examen = "echographie" | "mammographie" | "biopsie";
export type Soin = "consultation" | "echographie" | "biopsie" | "transport";

export type CapacitePaiement = "peut_payer" | "partielle" | "ne_peut_pas";

export type StatutConsultation = "brouillon" | "analysee" | "validee" | "close";
export type StatutOrientation =
  | "brouillon"
  | "envoyee"
  | "recue"
  | "examens"
  | "resultat"
  | "close"
  | "absente";
export type StatutFinancement = "proposee" | "confirmee" | "refusee" | "retiree";

export type EtapeSuivi = "recue" | "examens" | "resultat" | "absente";
export type ResultatSuivi =
  | "en_attente"
  | "benin"
  | "a_surveiller"
  | "cancer_confirme";

/*
 * Rôles de la plateforme.
 *
 * Les ONG ne sont plus un rôle : elles ne se connectent pas et ne décident
 * rien ici. Elles restent présentes comme BAILLEURS — un financement porte le
 * nom de celle qui prend les soins en charge — mais l'accord se traite hors
 * de l'application.
 */
export type Role = "agent" | "centre" | "admin";

export interface District {
  id: string;
  nom: string;
  latitude: number;
  longitude: number;
}

/**
 * Nature d'une structure de santé.
 *
 * - `base`       : CSPS, CMA — là où l'agent exerce et reçoit la femme. Ne
 *                  reçoit JAMAIS d'orientation.
 * - `specialise` : CHU, CHR, polyclinique — la destination du dossier, et le
 *                  lieu d'exercice du spécialiste qui ouvre un compte.
 *
 * Cette nature est une donnée, jamais une déduction depuis `examens` :
 * plusieurs CMA ont un échographe et seraient sinon proposés comme
 * destination d'un niveau « orange », qui n'exige que l'échographie. L'agent
 * enverrait alors le dossier à une structure sans sénologue.
 */
export type TypeCentre = "base" | "specialise";

export interface Centre {
  id: string;
  nom: string;
  service: string;
  /** Défaut `base` : une structure dont la nature est inconnue ne reçoit pas
   *  d'orientation. Se tromper dans ce sens est sans danger ; l'inverse
   *  envoie une femme au mauvais endroit. */
  type: TypeCentre;
  latitude: number;
  longitude: number;
  examens: Examen[];
  places_semaine: number;
  actif: boolean;
  /** District de rattachement. Absent pour un CHU national. */
  district_id?: string | null;
}

export interface Creneau {
  id: string;
  centre_id: string;
  /** Date ISO du debut du rendez-vous. */
  debut: string;
  libre: boolean;
}

export interface Tarif {
  centre_id: string;
  soin: Soin;
  /** Montant en FCFA. */
  montant: number;
}

export interface Patiente {
  id: string;
  code: string;
  agent_id: string;
  nom: string;
  age: number;
  district_id: string;
  village: string | null;
  telephone: string | null;
  capacite_paiement: CapacitePaiement;
  consentement: boolean;
  cree_le: string;
}

export interface Consultation {
  id: string;
  patiente_id: string;
  agent_id: string;
  recit: string;
  fiche: Fiche | null;
  niveau_propose: Niveau | null;
  regles_declenchees: string[];
  explication: string | null;
  niveau_valide: Niveau | null;
  raison_correction: string | null;
  commentaire_correction: string | null;
  statut: StatutConsultation;
  cree_le: string;
}

export interface Orientation {
  id: string;
  consultation_id: string;
  centre_id: string;
  creneau_id: string;
  score: number;
  resume_ia: string | null;
  statut: StatutOrientation;
  envoyee_le: string | null;
  cree_le: string;
}

export interface Ong {
  id: string;
  nom: string;
  budget_total: number;
  budget_restant: number;
}

export interface RegleFinancement {
  id: string;
  ong_id: string;
  districts: string[];
  niveaux: Niveau[];
  situations: CapacitePaiement[];
  active: boolean;
}

export interface Financement {
  id: string;
  orientation_id: string;
  ong_id: string;
  montant: number;
  statut: StatutFinancement;
  raison_refus: string | null;
  cree_le: string;
}

export interface Suivi {
  id: string;
  orientation_id: string;
  etape: EtapeSuivi;
  resultat: ResultatSuivi;
  note: string | null;
  auteur_id: string;
  cree_le: string;
}

export interface Profil {
  id: string;
  nom: string;
  email: string;
  role: Role;
  centre_sante: string | null;
  centre_id: string | null;
  ong_id: string | null;
  /* Comptes créés dans l'application (inscription). */
  prenoms?: string;
  sexe?: "femme" | "homme";
  specialite?: string;
  telephone?: string;
  /** Renseignés à l'inscription d'un agent. */
  prenom?: string | null;
  statut?: StatutAgent | null;
  matricule?: string | null;
}

/** Métier déclaré par l'agent à l'inscription. */
export type StatutAgent =
  | "infirmier_etat"
  | "medecin_generaliste"
  | "agent_communautaire";
