"use client";

import { useState } from "react";
import { Espace } from "@/components/Espace";
import { Carte, Chargement, MessageSucces, TitreSection } from "@/components/Interface";
import { basculerCentreActif, listerCentres, listerTarifs, modifierTarif } from "@/lib/data";
import { formaterFcfa, LIBELLE_SOIN } from "@/lib/financement";
import { useDonnees } from "@/lib/hooks";
import { LIENS_ADMIN } from "@/lib/nav";
import type { Centre, Soin } from "@/lib/types";

const SOINS: Soin[] = ["consultation", "echographie", "biopsie", "transport"];
const LIBELLE_EXAMEN: Record<string, string> = {
  echographie: "échographie",
  mammographie: "mammographie",
  biopsie: "biopsie",
};

/**
 * Centres et tarifs.
 *
 * Un centre en sommeil sort du matching sans être supprimé : c'est ce qu'on
 * fait quand un centre n'a plus de créneaux ou ferme temporairement. Les tarifs
 * servent au calcul de la prise en charge : les modifier change le montant
 * demandé aux financeurs.
 */
export default function Centres() {
  return (
    <Espace role="admin" liens={LIENS_ADMIN} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const [succes, setSucces] = useState<string | null>(null);
  const { donnees, pret } = useDonnees(() => ({
    centres: listerCentres(),
    tarifs: listerTarifs(),
  }));

  if (!pret || !donnees) return <Chargement />;

  return (
    <>
      <TitreSection aide="Les centres qui reçoivent les dossiers, et ce que coûtent les soins.">
        Centres et tarifs
      </TitreSection>

      {succes ? (
        <div className="mb-4">
          <MessageSucces>{succes}</MessageSucces>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {donnees.centres.map((c) => (
          <CarteCentre
            key={c.id}
            centre={c}
            tarifs={donnees.tarifs.filter((t) => t.centre_id === c.id)}
            onMessage={setSucces}
          />
        ))}
      </div>
    </>
  );
}

function CarteCentre({
  centre,
  tarifs,
  onMessage,
}: {
  centre: Centre;
  tarifs: { soin: Soin; montant: number }[];
  onMessage: (m: string) => void;
}) {
  return (
    <Carte>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">{centre.nom}</h2>
          <p className="mt-1 text-sm text-sable-600">
            {centre.service} ·{" "}
            {centre.examens.map((e) => LIBELLE_EXAMEN[e] ?? e).join(", ") || "aucun examen"} ·{" "}
            <span className="chiffres-fixes">{centre.places_semaine}</span> places par semaine
          </p>
        </div>
        <label className="flex min-h-[var(--spacing-cible)] cursor-pointer items-center gap-2 text-[0.95rem] text-prune-800">
          <input
            type="checkbox"
            checked={centre.actif}
            onChange={(e) => {
              basculerCentreActif(centre.id, e.target.checked);
              onMessage(
                e.target.checked
                  ? `${centre.nom} reçoit de nouveau des dossiers.`
                  : `${centre.nom} est en sommeil : il sort du matching.`,
              );
            }}
            className="h-5 w-5 accent-rose-600"
          />
          Reçoit des dossiers
        </label>
      </div>

      <table className="mt-4 w-full text-left text-[0.95rem]">
        <caption className="lecteur-seul">Tarifs des soins de {centre.nom}</caption>
        <thead>
          <tr className="border-b border-sable-200 text-sm text-sable-600">
            <th scope="col" className="py-2 font-normal">
              Soin
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              Tarif (FCFA)
            </th>
          </tr>
        </thead>
        <tbody>
          {SOINS.map((soin) => {
            const t = tarifs.find((x) => x.soin === soin);
            return (
              <tr key={soin} className="border-b border-sable-100 last:border-0">
                <td className="py-2 text-prune-900">{LIBELLE_SOIN[soin]}</td>
                <td className="py-1 text-right">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={500}
                    defaultValue={t?.montant ?? 0}
                    aria-label={`Tarif ${LIBELLE_SOIN[soin]} à ${centre.nom}`}
                    onBlur={(e) => {
                      const montant = Number(e.target.value);
                      modifierTarif(centre.id, soin, montant);
                      onMessage(`${LIBELLE_SOIN[soin]} : ${formaterFcfa(montant)}.`);
                    }}
                    className="chiffres-fixes min-h-[var(--spacing-cible)] w-32 rounded-[var(--radius-moyen)] border border-sable-300 px-3 text-right text-prune-900"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Carte>
  );
}
