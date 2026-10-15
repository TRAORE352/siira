"use client";

import { useState } from "react";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Espace } from "@/components/Espace";
import { Carte, EtatVide, Squelette, TitreSection } from "@/components/Interface";
import {
  accorderPriseEnCharge,
  listerPrisesEnCharge,
  refuserPriseEnCharge,
} from "@/lib/data";
import { SOINS_PAR_NIVEAU, formaterFcfa } from "@/lib/financement";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_FINANCEMENT } from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import { useSession } from "@/lib/session";
import type { StatutFinancement } from "@/lib/types";

/** Soins demandés, écrits avec les accents comme le reste de l'interface. */
const SOIN_AFFICHE: Record<string, string> = {
  consultation: "Consultation spécialisée",
  echographie: "Échographie mammaire",
  biopsie: "Biopsie",
  transport: "Transport",
};

const STYLE_STATUT: Record<StatutFinancement, string> = {
  proposee: "border-orange-bord bg-orange-bg text-orange-texte",
  confirmee: "border-vert-bord bg-vert-bg text-vert-texte",
  refusee: "border-rouge-bord bg-rouge-bg text-rouge-texte",
  retiree: "border-sable-300 bg-sable-100 text-sable-700",
};

export default function PrisesEnCharge() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const centreId = profil?.centre_id ?? "";
  const { donnees, pret } = useDonnees(() => listerPrisesEnCharge(centreId));
  const [erreur, setErreur] = useState<string | null>(null);

  function agir(action: () => void) {
    setErreur(null);
    try {
      action();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
    }
  }

  if (!pret) return <Squelette lignes={4} />;
  const dossiers = donnees ?? [];

  return (
    <>
      <TitreSection aide="Les demandes de prise en charge de vos dossiers. Enregistrez l'accord d'un partenaire, ou refusez la demande.">
        Prises en charge
      </TitreSection>

      {erreur ? (
        <p role="alert" className="mb-4 text-sm font-medium text-rouge-fort">
          {erreur}
        </p>
      ) : null}

      {dossiers.length === 0 ? (
        <EtatVide
          titre="Aucune demande de prise en charge"
          texte="Les demandes de financement des dossiers orientés vers votre centre apparaissent ici."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {dossiers.map((dossier) => {
            const soins =
              dossier.niveau === "orange" || dossier.niveau === "rouge"
                ? SOINS_PAR_NIVEAU[dossier.niveau]
                : [];
            return (
              <li key={dossier.orientation_id}>
                <Carte>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-prune-900">
                          {dossier.patiente.nom}
                        </span>
                        {dossier.niveau ? (
                          <BadgeNiveau niveau={dossier.niveau} taille="petit" />
                        ) : null}
                      </div>
                      <p className="text-sm text-sable-600">
                        {dossier.patiente.age} ans · {dossier.district?.nom ?? "—"} ·{" "}
                        {dossier.patiente.code}
                      </p>
                    </div>
                  </div>

                  {soins.length > 0 ? (
                    <p className="mt-2 text-sm text-sable-600">
                      Soins demandés :{" "}
                      {soins.map((s) => SOIN_AFFICHE[s] ?? s).join(", ")}
                    </p>
                  ) : null}

                  <ul className="mt-3 flex flex-col divide-y divide-sable-100 border-t border-sable-200">
                    {dossier.demandes.map(({ financement, ong }) => (
                      <li
                        key={financement.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <p className="text-[0.95rem] text-prune-800">
                            {ong?.nom ?? "Partenaire"}
                          </p>
                          <p className="text-sm text-sable-600">
                            {formaterFcfa(financement.montant)}
                          </p>
                        </div>

                        {financement.statut === "proposee" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => agir(() => accorderPriseEnCharge(financement.id))}
                              className="flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] bg-rose-600 px-3 text-[0.95rem] font-medium text-white hover:bg-rose-700"
                            >
                              Accorder
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                agir(() => refuserPriseEnCharge(financement.id, null))
                              }
                              className="flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border border-sable-300 bg-white px-3 text-[0.95rem] text-prune-800 hover:bg-sable-100"
                            >
                              Refuser
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-sm font-medium ${
                              STYLE_STATUT[financement.statut]
                            }`}
                          >
                            {LIBELLE_STATUT_FINANCEMENT[financement.statut]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Carte>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
