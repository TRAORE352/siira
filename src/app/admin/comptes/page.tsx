"use client";

import { useState } from "react";
import { Espace } from "@/components/Espace";
import { Carte, Chargement, MessageSucces, TitreSection } from "@/components/Interface";
import { listerComptesAgents, listerProfils, supprimerCompteAgent, trouverCentre } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_AGENT } from "@/lib/libelles";
import { LIENS_ADMIN } from "@/lib/nav";
import { LIBELLE_ROLE } from "@/lib/session";

/**
 * Comptes de la plateforme.
 *
 * Deux familles : les comptes de démonstration, posés par le jeu de données, et
 * ceux créés depuis l'application par l'inscription. L'équipe voit les deux, et
 * peut retirer un compte inscrit ; les comptes de démonstration se modifient
 * dans le jeu de données, pas ici.
 */
export default function Comptes() {
  return (
    <Espace role="admin" liens={LIENS_ADMIN} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const [succes, setSucces] = useState<string | null>(null);
  const { donnees, pret } = useDonnees(() => ({
    demo: listerProfils(),
    inscrits: listerComptesAgents(),
  }));

  if (!pret || !donnees) return <Chargement />;

  function retirer(profilId: string, nom: string) {
    supprimerCompteAgent(profilId);
    setSucces(`Le compte de ${nom} est retiré.`);
  }

  return (
    <>
      <TitreSection aide="Qui peut entrer dans Siira, et à quel titre.">
        Comptes
      </TitreSection>

      {succes ? (
        <div className="mb-4">
          <MessageSucces>{succes}</MessageSucces>
        </div>
      ) : null}

      <Carte>
        <h2 className="mb-3 text-lg">Comptes créés depuis l&apos;application</h2>
        {donnees.inscrits.length === 0 ? (
          <p className="text-[0.95rem] text-sable-600">
            Aucun pour le moment. Un agent qui s&apos;inscrit depuis son téléphone
            apparaît ici.
          </p>
        ) : (
          <ul className="flex flex-col">
            {donnees.inscrits.map((c) => (
              <li
                key={c.profil.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-sable-200 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[0.95rem] text-prune-900">{c.profil.nom}</p>
                  <p className="text-sm text-sable-600">
                    {c.profil.statut ? LIBELLE_STATUT_AGENT[c.profil.statut] : "Agent"} ·{" "}
                    {c.profil.centre_sante ?? "Centre non précisé"} · matricule{" "}
                    <span className="chiffres-fixes">{c.matricule}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => retirer(c.profil.id, c.profil.nom)}
                  className="flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border border-rouge-bord bg-white px-3 text-[0.95rem] text-rouge-texte hover:bg-rouge-bg"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </Carte>

      <div className="mt-4">
        <Carte>
          <h2 className="mb-3 text-lg">Comptes de démonstration</h2>
          <ul className="flex flex-col">
            {donnees.demo.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sable-200 py-2 last:border-0"
              >
                <span className="text-[0.95rem] text-prune-900">{p.nom}</span>
                <span className="text-sm text-sable-600">
                  {LIBELLE_ROLE[p.role]}
                  {p.centre_id
                    ? ` · ${trouverCentre(p.centre_id)?.nom ?? p.centre_id}`
                    : p.centre_sante
                      ? ` · ${p.centre_sante}`
                      : ""}
                  {p.matricule ? ` · matricule ${p.matricule}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      </div>
    </>
  );
}
