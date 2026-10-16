"use client";

import { useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Espace } from "@/components/Espace";
import {
  Carte,
  Chargement,
  Ligne,
  MessageInfo,
  MessageSucces,
  TitreSection,
} from "@/components/Interface";
import { lireEtat, reinitialiser } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIENS_ADMIN } from "@/lib/nav";

/**
 * Démonstration.
 *
 * Remet la plateforme dans son état de départ — patientes, orientations,
 * budgets, rendez-vous — sans toucher aux comptes créés depuis l'application,
 * qu'on ne veut pas voir disparaître au milieu d'un essai.
 */
export default function Demonstration() {
  return (
    <Espace role="admin" liens={LIENS_ADMIN} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const [succes, setSucces] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const { donnees, pret } = useDonnees(() => {
    const e = lireEtat();
    return {
      patientes: e.patientes.length,
      consultations: e.consultations.length,
      orientations: e.orientations.length,
      financements: e.financements.length,
      suivis: e.suivis.length,
      creneaux: e.creneaux.length,
      creneauxLibres: e.creneaux.filter((c) => c.libre).length,
      comptes: (e.comptes ?? []).length,
    };
  });

  if (!pret || !donnees) return <Chargement />;

  function remettreAZero() {
    reinitialiser();
    setConfirmation(false);
    setSucces("La démonstration est revenue à son état de départ.");
  }

  return (
    <>
      <TitreSection aide="Remettre la plateforme dans son état de départ, avant une démonstration.">
        Démonstration
      </TitreSection>

      {succes ? (
        <div className="mb-4">
          <MessageSucces>{succes}</MessageSucces>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Carte>
          <h2 className="mb-3 text-lg">État actuel</h2>
          <dl>
            <Ligne libelle="Patientes">{donnees.patientes}</Ligne>
            <Ligne libelle="Consultations">{donnees.consultations}</Ligne>
            <Ligne libelle="Orientations">{donnees.orientations}</Ligne>
            <Ligne libelle="Prises en charge">{donnees.financements}</Ligne>
            <Ligne libelle="Étapes de suivi">{donnees.suivis}</Ligne>
            <Ligne libelle="Rendez-vous">
              {donnees.creneauxLibres} libres sur {donnees.creneaux}
            </Ligne>
            <Ligne libelle="Comptes créés ici">{donnees.comptes}</Ligne>
          </dl>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Revenir à l&apos;état de départ</h2>
          <MessageInfo>
            Tout revient au départ : patientes, consultations, orientations, prises en
            charge, budgets et rendez-vous. Les onglets ouverts se mettent à jour
            aussitôt. Les comptes créés depuis l&apos;application restent.
          </MessageInfo>
          <div className="mt-4">
            {!confirmation ? (
              <Bouton variante="danger" onClick={() => setConfirmation(true)}>
                Réinitialiser la démo
              </Bouton>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Bouton variante="danger" onClick={remettreAZero}>
                  Oui, tout remettre à zéro
                </Bouton>
                <Bouton variante="second" onClick={() => setConfirmation(false)}>
                  Annuler
                </Bouton>
              </div>
            )}
          </div>
        </Carte>
      </div>
    </>
  );
}
