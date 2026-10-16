"use client";

/**
 * Session de démonstration.
 *
 * Phase 1 : la connexion est simulée. On retient simplement quel compte de
 * démonstration est utilisé, dans le stockage du navigateur.
 * Phase 2 : remplacé par Supabase Auth, sans changer les écrans qui
 * appellent `useSession()`.
 */

import { useSyncExternalStore } from "react";
import type { Profil } from "./types";
import { cleMatricule } from "./comptes";
import { REFERENTIELS, lireEtat } from "./data/magasin";
import { ACCUEIL_PAR_ROLE, ESPACE_ACTIF, LIBELLE_ROLE, roleAutorise } from "./espaces";

/*
 * Les deux tables ci-dessous viennent de `espaces.ts`, qui est aussi lu par le
 * middleware, côté serveur. On les ré-exporte ici pour que les écrans gardent
 * une seule source d'import.
 */
export { ACCUEIL_PAR_ROLE, LIBELLE_ROLE };

/** Ce rôle a-t-il le droit d'ouvrir l'espace de cette adresse ? */
export function sessionAutorisee(profil: Profil): boolean {
  return roleAutorise(ESPACE_ACTIF, profil.role);
}

/*
 * La session vit dans le stockage de l'ONGLET (sessionStorage), pas du
 * navigateur : pendant la démonstration, l'agent et le centre sont ouverts
 * côte à côte dans deux onglets du même navigateur, chacun avec son propre
 * compte. Les données, elles, restent partagées entre tous les onglets.
 */
const CLE = "siira.session.v1";
/* Profil complet de la session, pour les comptes réels : eux n'existent dans
   aucun référentiel local, donc un identifiant seul ne suffit pas à les
   retrouver. */
const CLE_PROFIL = "siira.profil.v1";

export function listerComptesDemo(): Profil[] {
  return REFERENTIELS.profils;
}

export function trouverCompte(email: string): Profil | undefined {
  const cherche = email.trim().toLowerCase();
  return REFERENTIELS.profils.find((p) => p.email.toLowerCase() === cherche);
}

/*
 * Connexion de l'agent par numéro de téléphone.
 *
 * Phase 1 : aucun serveur ne vérifie quoi que ce soit. Tout numéro burkinabè
 * valide et tout code à 6 chiffres ouvrent l'espace. Le numéro est retenu pour
 * que l'écran puisse l'afficher et que le même numéro retrouve toujours le
 * même agent de démonstration — sinon la liste des patientes changerait d'une
 * connexion à l'autre, ce qui serait incompréhensible pour qui teste.
 *
 * Phase 2 : Supabase Auth vérifiera le couple numéro / code. Les écrans qui
 * appellent `useSession()` ne changeront pas.
 */
const CLE_NUMERO = "siira.numero.v1";

/** Agents de démonstration, dans l'ordre d'attribution. */
function agentsDemo(): Profil[] {
  return REFERENTIELS.profils.filter((p) => p.role === "agent");
}

/**
 * Attribue toujours le même agent à un même numéro, par la somme de ses
 * chiffres. Un numéro inconnu reçoit donc un agent stable, pas un au hasard.
 */
export function agentPourNumero(numero: string): Profil | undefined {
  const agents = agentsDemo();
  if (agents.length === 0) return undefined;
  const chiffres = numero.replace(/\D/g, "");
  let somme = 0;
  for (const c of chiffres) somme += Number(c);
  return agents[somme % agents.length];
}

/** Ouvre la session d'un agent à partir de son numéro, sous forme canonique. */
export function ouvrirSessionParNumero(numeroCanonique: string): Profil | undefined {
  const profil = agentPourNumero(numeroCanonique);
  if (!profil) return undefined;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(CLE_NUMERO, numeroCanonique);
  }
  ouvrirSession(profil.id);
  return profil;
}

/** Numéro avec lequel la session a été ouverte, s'il y en a un. */
export function lireNumeroSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(CLE_NUMERO);
}

/*
 * Connexion du centre par numéro matricule.
 *
 * Phase 1 : aucun serveur ne vérifie quoi que ce soit. Tout matricule et tout
 * mot de passe ouvrent l'espace du centre. Le matricule est retenu pour que
 * l'écran puisse l'afficher, et un même matricule retrouve toujours le même
 * centre de démonstration.
 */
const CLE_MATRICULE = "siira.matricule.v1";

/** Centres de démonstration, dans l'ordre d'attribution. */
function centresDemo(): Profil[] {
  return REFERENTIELS.profils.filter((p) => p.role === "centre");
}

/** Attribue toujours le même centre à un même matricule (somme des chiffres). */
export function centrePourMatricule(matricule: string): Profil | undefined {
  const centres = centresDemo();
  if (centres.length === 0) return undefined;
  const chiffres = matricule.replace(/\D/g, "");
  let somme = 0;
  for (const c of chiffres) somme += Number(c);
  return centres[somme % centres.length];
}

/**
 * Profil derrière un matricule.
 *
 * Trois cas, dans cet ordre : un compte de démonstration qui porte ce matricule
 * (l'équipe Siira entre par `SIIRA-ADMIN`), un compte créé à l'inscription, et
 * — comme avant — un centre de démonstration attribué d'après les chiffres du
 * matricule, pour que n'importe quelle saisie ouvre un espace crédible.
 */
export function profilParMatricule(matricule: string): Profil | undefined {
  const cle = cleMatricule(matricule);
  if (!cle) return undefined;

  /* Compte de démonstration qui porte ce matricule — l'équipe : SIIRA-ADMIN. */
  const referentiel = REFERENTIELS.profils.find(
    (p) => p.matricule && cleMatricule(p.matricule) === cle,
  );
  if (referentiel) return referentiel;

  /* Compte de centre créé à l'inscription. */
  const centre = trouverCompteInscrit(matricule)?.profil;
  if (centre) return centre;

  /* Compte d'agent créé à l'inscription. */
  const agent = lireEtat().comptes?.find((c) => cleMatricule(c.matricule) === cle)?.profil;
  if (agent) return agent;

  /* Et à défaut, un centre de démonstration, comme avant. */
  return centrePourMatricule(matricule);
}

/** Ouvre la session d'un centre à partir de son matricule. */
export function ouvrirSessionParMatricule(matricule: string): Profil | undefined {
  const profil = profilParMatricule(matricule);
  if (!profil) return undefined;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(CLE_MATRICULE, matricule);
  }
  ouvrirSession(profil.id);
  return profil;
}

/** Matricule avec lequel la session a été ouverte, s'il y en a un. */
export function lireMatriculeSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(CLE_MATRICULE);
}

/* ------------------------------------------------------------------ */
/* Comptes créés par inscription                                        */
/* ------------------------------------------------------------------ */

export interface CompteInscrit {
  matricule: string;
  motDePasse: string;
  profil: Profil;
}

const CLE_COMPTES = "siira.comptes.v1";

function lireComptes(): CompteInscrit[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = window.localStorage.getItem(CLE_COMPTES);
    return brut ? (JSON.parse(brut) as CompteInscrit[]) : [];
  } catch {
    return [];
  }
}

function ecrireComptes(comptes: CompteInscrit[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE_COMPTES, JSON.stringify(comptes));
  } catch {
    // Stockage plein ou refusé : l'inscription n'est pas conservée.
  }
}

export function listerComptesInscrits(): CompteInscrit[] {
  return lireComptes();
}

export function trouverCompteInscrit(matricule: string): CompteInscrit | undefined {
  const cherche = matricule.trim().toLowerCase();
  return lireComptes().find((c) => c.matricule.toLowerCase() === cherche);
}

export function enregistrerCompte(compte: CompteInscrit): void {
  const comptes = lireComptes();
  comptes.push(compte);
  ecrireComptes(comptes);
}

/**
 * Met à jour les informations modifiables d'un compte inscrit (téléphone,
 * spécialité, sexe, centre de rattachement…). Renvoie le profil mis à jour,
 * ou null si le compte n'est pas un compte inscrit (compte de démonstration).
 */
export function mettreAJourCompte(
  profilId: string,
  changements: Partial<Profil>,
): Profil | null {
  const comptes = lireComptes();
  const compte = comptes.find((c) => c.profil.id === profilId);
  if (!compte) return null;
  compte.profil = { ...compte.profil, ...changements };
  ecrireComptes(comptes);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("siira-session"));
  }
  return compte.profil;
}

function nouvelId(prefixe: string): string {
  return `${prefixe}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Enregistre un nouveau compte de centre et renvoie son profil. */
export function creerCompteCentre(donnees: {
  nom: string;
  prenoms: string;
  sexe: "femme" | "homme";
  specialite: string;
  centreId: string;
  matricule: string;
  motDePasse: string;
}): Profil {
  const centre = REFERENTIELS.centres.find((c) => c.id === donnees.centreId);
  const profil: Profil = {
    id: nouvelId("pro"),
    nom: `${donnees.prenoms} ${donnees.nom}`.trim(),
    email: "",
    role: "centre",
    centre_sante: centre?.nom ?? null,
    centre_id: donnees.centreId,
    ong_id: null,
    prenoms: donnees.prenoms,
    sexe: donnees.sexe,
    specialite: donnees.specialite,
    matricule: donnees.matricule,
  };
  enregistrerCompte({
    matricule: donnees.matricule,
    motDePasse: donnees.motDePasse,
    profil,
  });
  return profil;
}

/**
 * Connecte un centre par matricule et mot de passe.
 * Un matricule inscrit voit son mot de passe vérifié ; sinon (Phase 1) tout
 * matricule ouvre un centre de démonstration.
 */
export function connecterParMatricule(
  matricule: string,
  motDePasse: string,
): { profil: Profil } | { erreur: string } {
  const compte = trouverCompteInscrit(matricule);
  if (compte) {
    if (compte.motDePasse !== motDePasse) {
      return { erreur: "Matricule ou mot de passe incorrect." };
    }
    ouvrirSession(compte.profil.id);
    return { profil: compte.profil };
  }
  /* Compte de démonstration, compte inscrit, ou centre attribué d'après les chiffres. */
  const profil = profilParMatricule(matricule);
  if (!profil) {
    return { erreur: "Impossible d'ouvrir votre espace. Réessayez dans un instant." };
  }
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(CLE_MATRICULE, matricule);
  }
  ouvrirSession(profil.id);
  return { profil };
}

/** Retrouve un profil par identifiant, parmi les comptes de démo et inscrits. */
function trouverProfil(id: string): Profil | null {
  const referentiel = REFERENTIELS.profils.find((p) => p.id === id);
  if (referentiel) return referentiel;

  /* Compte d'agent créé à l'inscription : il vit dans l'état de la démonstration. */
  const agent = lireEtat().comptes?.find((c) => c.profil.id === id)?.profil;
  if (agent) return agent;

  /* Compte de centre créé à l'inscription : il vit dans le stockage local. */
  return lireComptes().find((c) => c.profil.id === id)?.profil ?? null;
}

export function ouvrirSession(profilId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CLE, profilId);
  window.dispatchEvent(new Event("siira-session"));
}

/**
 * Ouvre la session d'un compte RÉEL, en retenant son profil en entier.
 *
 * Un compte réel n'existe dans aucun référentiel local : retenir son seul
 * identifiant laisserait `lireSession` incapable de le retrouver, et le garde
 * de l'espace renverrait l'agent vers /connexion juste après une
 * authentification réussie.
 */
export function ouvrirSessionReelle(profil: Profil) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CLE_PROFIL, JSON.stringify(profil));
  window.sessionStorage.setItem(CLE, profil.id);
  window.dispatchEvent(new Event("siira-session"));
}

export function fermerSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CLE);
  /* Les deux clés tombent ensemble : un profil réel laissé derrière
     rouvrirait la session à la prochaine lecture. */
  window.sessionStorage.removeItem(CLE_PROFIL);
  window.dispatchEvent(new Event("siira-session"));
}

/**
 * Profil de la session en cours.
 *
 * Deux sources, et la seconde est indispensable aux comptes RÉELS. La session
 * ne retenait qu'un identifiant, puis relisait le profil par `trouverProfil`,
 * qui ne cherche que dans les profils de DÉMONSTRATION : un compte réel ne s'y
 * trouve jamais. L'agent s'authentifiait donc correctement — jeton, profil,
 * rôle, tout en 200 — puis le garde de l'espace ne retrouvait pas son profil,
 * le prenait pour un visiteur et le renvoyait vers /connexion. L'écran de
 * connexion restait affiché sans aucun message : rien n'avait échoué.
 *
 * Le profil réel est donc enregistré en entier à l'ouverture de la session, et
 * relu ici en priorité.
 */
export function lireSession(): Profil | null {
  if (typeof window === "undefined") return null;
  const brut = window.sessionStorage.getItem(CLE_PROFIL);
  if (brut) {
    try {
      return JSON.parse(brut) as Profil;
    } catch {
      /* Entrée abîmée : on l'efface plutôt que de boucler sur une erreur. */
      window.sessionStorage.removeItem(CLE_PROFIL);
    }
  }
  const id = window.sessionStorage.getItem(CLE);
  if (!id) return null;
  return trouverProfil(id);
}

/** Abonnement aux changements de session, dans cet onglet et dans les autres. */
function abonnerSession(prevenir: () => void): () => void {
  window.addEventListener("siira-session", prevenir);
  window.addEventListener("storage", prevenir);
  return () => {
    window.removeEventListener("siira-session", prevenir);
    window.removeEventListener("storage", prevenir);
  };
}

/** Identifiant du compte connecté, ou chaîne vide. Stable entre deux lectures. */
function lireIdentifiant(): string {
  return window.sessionStorage.getItem(CLE) ?? "";
}

function identifiantServeur(): string | null {
  return null;
}

/**
 * Profil connecté.
 * `pret` passe à vrai dès la première lecture côté navigateur : les écrans
 * attendent ce signal avant de rediriger, pour éviter tout clignotement.
 */
export function useSession(): { profil: Profil | null; pret: boolean } {
  const identifiant = useSyncExternalStore(
    abonnerSession,
    lireIdentifiant,
    identifiantServeur,
  );

  // Rendu serveur : on ne sait encore rien, l'écran reste en chargement.
  if (identifiant === null) return { profil: null, pret: false };

  /*
   * `lireSession` et non `trouverProfil` : ce dernier ne cherche que dans les
   * profils de DÉMONSTRATION. Un compte réel ne s'y trouve pas, donc le garde
   * de l'espace (`<Espace>`) recevait `profil: null`, prenait l'agent pour un
   * visiteur et le renvoyait vers /connexion — après une authentification
   * pourtant réussie, et sans aucun message. L'adresse devenait bien /agent,
   * mais l'écran affiché restait celui de la connexion.
   */
  const profil = identifiant ? lireSession() : null;
  return { profil, pret: true };
}
