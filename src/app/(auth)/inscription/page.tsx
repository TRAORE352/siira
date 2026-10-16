"use client";

import { InscriptionAgent } from "./InscriptionAgent";
import { InscriptionComptes } from "./InscriptionComptes";
import { ESPACE_ACTIF } from "@/lib/espaces";

/**
 * Inscription, selon l'adresse.
 *
 * Comme l'écran de connexion, la page sert deux publics : l'agent de santé, qui
 * crée son compte depuis son téléphone (nom, prénom, statut, centre de santé,
 * matricule, mot de passe), et le centre spécialisé, qui crée le sien sur
 * ordinateur (spécialité, sexe, centre, matricule, mot de passe). Chacun ne
 * voit que le sien, et l'application complète — l'adresse de démonstration —
 * montre celui du centre.
 */
export default function Inscription() {
  if (ESPACE_ACTIF === "agent") return <InscriptionAgent />;
  return <InscriptionComptes />;
}
