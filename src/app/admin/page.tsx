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
import { lireEtat, listerProfils, reinitialiser } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_ROLE } from "@/lib/session";

export default function Admin() {
  return (
    <Espace role="admin" large>
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
      creneauxLibres: e.creneaux.filter((c) => c.libre).length,
      ongs: e.ongs,
      profils: listerProfils(),
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
      <TitreSection aide="Pilotage de la démonstration.">Espace équipe Siira</TitreSection>

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
            <Ligne libelle="Demandes de financement">{donnees.financements}</Ligne>
            <Ligne libelle="Étapes de suivi">{donnees.suivis}</Ligne>
            <Ligne libelle="Rendez-vous libres">{donnees.creneauxLibres}</Ligne>
          </dl>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Budgets des ONG</h2>
          <dl>
            {donnees.ongs.map((o) => (
              <Ligne key={o.id} libelle={o.nom}>
                {o.budget_restant.toLocaleString("fr-FR")} sur{" "}
                {o.budget_total.toLocaleString("fr-FR")} FCFA
              </Ligne>
            ))}
          </dl>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Comptes de démonstration</h2>
          <ul className="flex flex-col">
            {donnees.profils.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sable-200 py-2 last:border-0"
              >
                <span className="text-[0.95rem] text-prune-900">{p.nom}</span>
                <span className="text-sm text-sable-600">
                  {p.email} · {LIBELLE_ROLE[p.role]}
                </span>
              </li>
            ))}
          </ul>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Réinitialiser la démonstration</h2>
          <MessageInfo>
            Tout revient à l&apos;état de départ : patientes, orientations, budgets et
            rendez-vous. Les onglets ouverts se mettent à jour aussitôt.
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
