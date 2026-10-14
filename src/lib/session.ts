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
import type { Profil, Role } from "./types";
import { REFERENTIELS } from "./data/magasin";

/*
 * La session vit dans le stockage de l'ONGLET (sessionStorage), pas du
 * navigateur : pendant la démonstration, l'agent, le centre et l'ONG sont
 * ouverts côte à côte dans trois onglets du même navigateur, chacun avec son
 * propre compte. Les données, elles, restent partagées entre tous les onglets.
 */
const CLE = "siira.session.v1";

/** Page d'accueil de chaque rôle. */
export const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  agent: "/agent",
  centre: "/centre",
  ong: "/ong",
  admin: "/admin",
};

export const LIBELLE_ROLE: Record<Role, string> = {
  agent: "Agent de santé",
  centre: "Centre spécialisé",
  ong: "ONG partenaire",
  admin: "Équipe Siira",
};

export function listerComptesDemo(): Profil[] {
  return REFERENTIELS.profils;
}

export function trouverCompte(email: string): Profil | undefined {
  const cherche = email.trim().toLowerCase();
  return REFERENTIELS.profils.find((p) => p.email.toLowerCase() === cherche);
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
