"use client";

import { ConnexionAgent } from "./ConnexionAgent";
import { ConnexionComptes } from "./ConnexionComptes";
import { ESPACE_ACTIF } from "@/lib/espaces";

/**
 * Écran de connexion.
 *
 * L'agent de santé se connecte avec son numéro de téléphone et un code à
 * 6 chiffres : c'est ce qu'il a sur lui, et ce qu'il sait taper. Les autres
 * espaces (centre spécialisé, équipe Siira) travaillent sur ordinateur et
 * gardent la connexion par compte le temps de la démonstration, car l'adresse
 * complète doit pouvoir ouvrir les deux espaces côte à côte.
 */
export default function Connexion() {
  if (ESPACE_ACTIF === "agent") return <ConnexionAgent />;
  return <ConnexionComptes />;
}
