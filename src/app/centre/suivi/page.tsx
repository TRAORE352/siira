"use client";

import { useMemo, useState } from "react";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Champ } from "@/components/Champs";
import { Espace } from "@/components/Espace";
import { Carte, EtatVide, Squelette, TitreSection } from "@/components/Interface";
import { SuiviForm } from "@/components/SuiviForm";
import { listerDossiersCentre } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { dateCourte, normaliserTexte } from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import { useSession } from "@/lib/session";

const STATUTS_A_SUIVRE = ["envoyee", "recue", "examens"];

export default function SuiviDesSoins() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const centreId = profil?.centre_id ?? "";
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const { donnees, pret } = useDonnees(() => {
    const dossiers = centreId ? listerDossiersCentre(centreId) : [];
    return dossiers.filter((d) => STATUTS_A_SUIVRE.includes(d.orientation.statut));
  });

  const aSuivre = useMemo(() => {
    const dossiers = donnees ?? [];
    if (!recherche.trim()) return dossiers;
    const q = normaliserTexte(recherche);
    return dossiers.filter((d) => normaliserTexte(d.patiente.nom).includes(q));
  }, [donnees, recherche]);

  if (!pret) return <Squelette lignes={4} />;

  return (
    <>
      <TitreSection aide="Cliquez sur une patiente pour enregistrer l'étape atteinte, le résultat et une note pour l'agent.">
        Suivi des soins
      </TitreSection>

      <Champ
        label="Rechercher une patiente"
        labelMasque
        placeholder="Rechercher une patiente…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="mb-4 max-w-md"
      />

      {aSuivre.length === 0 ? (
        <EtatVide
          titre="Aucun suivi en attente"
          texte="Les dossiers en cours de prise en charge apparaissent ici."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {aSuivre.map((d) => {
            const estOuvert = ouvert === d.orientation.id;
            return (
              <li key={d.orientation.id}>
                <Carte className="p-0">
                  <button
                    type="button"
                    onClick={() => setOuvert(estOuvert ? null : d.orientation.id)}
                    aria-expanded={estOuvert}
                    className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-grand)] p-4 text-left hover:bg-sable-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-prune-900">{d.patiente.nom}</span>
                        {d.consultation.niveau_valide ? (
                          <BadgeNiveau niveau={d.consultation.niveau_valide} taille="petit" />
                        ) : null}
                      </div>
                      <p className="text-sm text-sable-600">
                        {d.patiente.age} ans · {d.district?.nom ?? "—"}
                        {d.creneau ? ` · ${dateCourte(d.creneau.debut)}` : ""}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`text-xl text-sable-400 transition-transform ${
                        estOuvert ? "rotate-90" : ""
                      }`}
                    >
                      ›
                    </span>
                  </button>

                  {estOuvert ? (
                    <div className="border-t border-sable-200 p-4">
                      <SuiviForm orientationId={d.orientation.id} auteurId={profil?.id ?? ""} />
                    </div>
                  ) : null}
                </Carte>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
