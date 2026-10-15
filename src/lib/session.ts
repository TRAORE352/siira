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
import { REFERENTIELS } from "./data/magasin";
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

export function ouvrirSession(profilId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CLE, profilId);
  window.dispatchEvent(new Event("siira-session"));
}

export function fermerSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CLE);
  window.dispatchEvent(new Event("siira-session"));
}

export function lireSession(): Profil | null {
  if (typeof window === "undefined") return null;
  const id = window.sessionStorage.getItem(CLE);
  if (!id) return null;
  return REFERENTIELS.profils.find((p) => p.id === id) ?? null;
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

  const profil = identifiant
    ? (REFERENTIELS.profils.find((p) => p.id === identifiant) ?? null)
    : null;
  return { profil, pret: true };
}
