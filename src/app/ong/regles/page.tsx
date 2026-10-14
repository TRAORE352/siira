"use client";

import { useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Espace } from "@/components/Espace";
import {
  Carte,
  Chargement,
  MessageInfo,
  MessageSucces,
  TitreSection,
} from "@/components/Interface";
import {
  enregistrerRegleFinancement,
  listerDistricts,
  listerReglesFinancement,
  trouverOng,
} from "@/lib/data";
import { formaterFcfa } from "@/lib/financement";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_PAIEMENT } from "@/lib/libelles";
import { LIENS_ONG } from "@/lib/nav";
import { useSession } from "@/lib/session";
import type { CapacitePaiement, Niveau, RegleFinancement } from "@/lib/types";

const MOT_NIVEAU: Record<Niveau, string> = {
  vert: "Vert",
  orange: "Orange",
  rouge: "Rouge",
};

export default function ReglesOng() {
  return (
    <Espace role="ong" liens={LIENS_ONG} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const ongId = profil?.ong_id ?? "";
  const [succes, setSucces] = useState<string | null>(null);

  const { donnees, pret } = useDonnees(() => {
    if (!ongId) return null;
    return {
      regles: listerReglesFinancement(ongId),
      ong: trouverOng(ongId),
      districts: listerDistricts(),
    };
  });

  if (!pret) return <Chargement />;
  if (!donnees?.ong) return <MessageInfo>Aucune ONG rattachée à ce compte.</MessageInfo>;

  function enregistrer(regle: RegleFinancement) {
    enregistrerRegleFinancement(regle);
    setSucces("Vos règles sont enregistrées. Elles s'appliquent au cas suivant.");
  }

  return (
    <>
      <TitreSection aide="Ces critères décident des cas qui vous sont proposés.">
        Mes règles de financement
      </TitreSection>

      {succes ? (
        <div className="mb-4">
          <MessageSucces>{succes}</MessageSucces>
        </div>
      ) : null}

      <Carte className="mb-4">
        <h2 className="mb-1 text-lg">{donnees.ong.nom}</h2>
        <p className="text-[0.95rem] text-prune-800">
          Budget restant : {formaterFcfa(donnees.ong.budget_restant)} sur{" "}
          {formaterFcfa(donnees.ong.budget_total)}.
        </p>
      </Carte>

      <div className="flex flex-col gap-4">
        {donnees.regles.map((r) => (
          <FormulaireRegle
            key={r.id}
            regle={r}
            districts={donnees.districts}
            surEnregistrement={enregistrer}
          />
        ))}
      </div>
    </>
  );
}

function FormulaireRegle({
  regle,
  districts,
  surEnregistrement,
}: {
  regle: RegleFinancement;
  districts: { id: string; nom: string }[];
  surEnregistrement: (r: RegleFinancement) => void;
}) {
  const [etat, setEtat] = useState<RegleFinancement>(regle);

  function basculer<K extends "districts" | "niveaux" | "situations">(
    cle: K,
    valeur: string,
  ) {
    setEtat((e) => {
      const liste = e[cle] as string[];
      const suivant = liste.includes(valeur)
        ? liste.filter((v) => v !== valeur)
        : [...liste, valeur];
      return { ...e, [cle]: suivant } as RegleFinancement;
    });
  }

  return (
    <Carte>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg">Critères</h3>
        <label className="flex min-h-[var(--spacing-cible)] cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={etat.active}
            onChange={(e) => setEtat({ ...etat, active: e.target.checked })}
            className="h-5 w-5 accent-rose-600"
          />
          <span className="text-[0.95rem] text-prune-900">Règle active</span>
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Groupe legende="Districts couverts">
          {districts.map((d) => (
            <Case
              key={d.id}
              libelle={d.nom}
              coche={etat.districts.includes(d.id)}
              surChangement={() => basculer("districts", d.id)}
            />
          ))}
        </Groupe>

        <Groupe legende="Niveaux d'urgence">
          {(["rouge", "orange", "vert"] as Niveau[]).map((n) => (
            <Case
              key={n}
              libelle={MOT_NIVEAU[n]}
              coche={etat.niveaux.includes(n)}
              surChangement={() => basculer("niveaux", n)}
            />
          ))}
        </Groupe>

        <Groupe legende="Situations couvertes">
          {(["ne_peut_pas", "partielle", "peut_payer"] as CapacitePaiement[]).map(
            (s) => (
              <Case
                key={s}
                libelle={LIBELLE_PAIEMENT[s]}
                coche={etat.situations.includes(s)}
                surChangement={() => basculer("situations", s)}
              />
            ),
          )}
        </Groupe>
      </div>

      <div className="mt-5">
        <Bouton onClick={() => surEnregistrement(etat)}>Enregistrer</Bouton>
      </div>
    </Carte>
  );
}

function Groupe({
  legende,
  children,
}: {
  legende: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 text-[0.95rem] font-medium text-prune-800">
        {legende}
      </legend>
      <div className="flex flex-col gap-2">{children}</div>
    </fieldset>
  );
}

function Case({
  libelle,
  coche,
  surChangement,
}: {
  libelle: string;
  coche: boolean;
  surChangement: () => void;
}) {
  return (
    <label
      className={`flex min-h-[var(--spacing-cible)] cursor-pointer items-center gap-3 rounded-[var(--radius-moyen)] border p-3 transition-colors ${
        coche
          ? "border-rose-600 bg-rose-50"
          : "border-sable-300 bg-white hover:bg-sable-100"
      }`}
    >
      <input
        type="checkbox"
        checked={coche}
        onChange={surChangement}
        className="h-5 w-5 shrink-0 accent-rose-600"
      />
      <span className="text-[0.95rem] text-prune-900">{libelle}</span>
    </label>
  );
}
