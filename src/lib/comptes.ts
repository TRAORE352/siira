/**
 * Comptes des agents de santé.
 *
 * Un agent crée son compte une fois : nom, prénom, statut, centre de santé,
 * matricule d'agent et mot de passe à 6 chiffres. C'est le matricule qui
 * identifie le compte, comme au centre.
 *
 * Phase 1 : tout se passe dans le navigateur — le compte est écrit dans l'état
 * de la démonstration, et le mot de passe n'en sort jamais. Phase 2 : Supabase
 * Auth prendra la vérification, et `profil` viendra de la table `profils`.
 */

import type { Profil, StatutAgent } from "./types";

/** Compte d'un agent, tel qu'il est créé à l'inscription. */
export interface CompteAgent {
  profil: Profil;
  matricule: string;
  /** Phase 1 seulement : jamais transmis, jamais affiché. */
  mot_de_passe: string;
}

export interface Inscription {
  nom: string;
  prenom: string;
  statut: StatutAgent | "";
  centre_sante: string;
  matricule: string;
  mot_de_passe: string;
  confirmation: string;
}

export type ChampInscription = keyof Inscription;

/** Le matricule s'écrit sans espaces : « ag 001 » devient « AG001 ». */
export function matriculeNormalise(matricule: string): string {
  return matricule.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Clé de comparaison : lettres et chiffres seuls. « ag 1042 » et « AG-1042 »
 * sont le même matricule — un tiret oublié ne doit pas ouvrir un second compte.
 */
export function cleMatricule(matricule: string): string {
  return matricule.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const MATRICULE = /^[A-Z0-9][A-Z0-9-]{3,11}$/;
const SIX_CHIFFRES = /^\d{6}$/;

/** Au moins deux lettres, avec les accents et les tirets des noms d'ici. */
function nomPlausible(valeur: string): boolean {
  const lettres = valeur.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g);
  return (lettres?.length ?? 0) >= 2;
}

/**
 * Fautes de l'inscription, champ par champ. Un objet vide veut dire que tout
 * est bon. Les messages disent quoi faire, jamais ce qui est mal.
 */
export function validerInscription(
  entree: Inscription,
  matriculesPris: readonly string[] = [],
): Partial<Record<ChampInscription, string>> {
  const fautes: Partial<Record<ChampInscription, string>> = {};

  if (!entree.nom.trim()) fautes.nom = "Indiquez le nom de famille.";
  else if (!nomPlausible(entree.nom)) fautes.nom = "Le nom paraît trop court.";

  if (!entree.prenom.trim()) fautes.prenom = "Indiquez le prénom.";
  else if (!nomPlausible(entree.prenom)) fautes.prenom = "Le prénom paraît trop court.";

  if (!entree.statut) fautes.statut = "Choisissez votre statut.";

  if (!entree.centre_sante.trim()) {
    fautes.centre_sante = "Indiquez votre centre de santé.";
  } else if (entree.centre_sante.trim().length < 3) {
    fautes.centre_sante = "Le nom du centre paraît trop court.";
  }

  const matricule = matriculeNormalise(entree.matricule);
  if (!matricule) fautes.matricule = "Indiquez votre matricule d'agent.";
  else if (!MATRICULE.test(matricule)) {
    fautes.matricule = "De 4 à 12 caractères : lettres, chiffres et tirets.";
  } else if (matriculesPris.map(cleMatricule).includes(cleMatricule(matricule))) {
    fautes.matricule = "Ce matricule est déjà utilisé.";
  }

  if (!SIX_CHIFFRES.test(entree.mot_de_passe)) {
    fautes.mot_de_passe = "Le mot de passe doit faire 6 chiffres.";
  }

  if (entree.confirmation !== entree.mot_de_passe) {
    fautes.confirmation = "Les deux mots de passe ne sont pas identiques.";
  } else if (!SIX_CHIFFRES.test(entree.confirmation)) {
    fautes.confirmation = "Confirmez les 6 chiffres.";
  }

  return fautes;
}

/** Lève les fautes d'une inscription, pour la couche de données. */
export class InscriptionRefusee extends Error {
  fautes: Partial<Record<ChampInscription, string>>;

  constructor(fautes: Partial<Record<ChampInscription, string>>) {
    super("Inscription refusée");
    this.name = "InscriptionRefusee";
    this.fautes = fautes;
  }
}
