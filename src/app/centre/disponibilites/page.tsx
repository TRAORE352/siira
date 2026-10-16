"use client";

import { useState } from "react";
import { AgendaSemaine } from "@/components/AgendaSemaine";
import { Bouton } from "@/components/Bouton";
import { Champ } from "@/components/Champs";
import { Espace } from "@/components/Espace";
import {
  Carte,
  MessageInfo,
  MessageSucces,
  Squelette,
  TitreSection,
} from "@/components/Interface";
import {
  changerDisponibiliteCreneau,
  creerCreneau,
  lireEtat,
  trouverCentre,
} from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIENS_CENTRE } from "@/lib/nav";
import { useSession } from "@/lib/session";

const LIBELLE_EXAMEN: Record<string, string> = {
  echographie: "Échographie mammaire",
  mammographie: "Mammographie",
  biopsie: "Biopsie",
};

export default function Disponibilites() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const centreId = profil?.centre_id ?? "";
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(true);
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);

  const { donnees, pret } = useDonnees(() => {
    const centre = trouverCentre(centreId);
    if (!centre) return null;
    const maintenant = Date.now();
    const creneaux = lireEtat()
      .creneaux.filter((c) => c.centre_id === centreId)
      .sort((a, b) => a.debut.localeCompare(b.debut));
    const libres = creneaux.filter(
      (c) => c.libre && new Date(c.debut).getTime() >= maintenant,
    ).length;
    return { centre, creneaux, libres };
  });

  function ajouter() {
    setErreur(null);
    setSucces(null);
    if (!date || !heure) {
      setErreur("Indiquez la date et l'heure du rendez-vous.");
      return;
    }
    const debut = new Date(`${date}T${heure}`);
    if (Number.isNaN(debut.getTime())) {
      setErreur("Date ou heure invalide.");
      return;
    }
    if (debut.getTime() < Date.now()) {
      setErreur("Choisissez une date à venir.");
      return;
    }
    try {
      creerCreneau(centreId, debut.toISOString());
      setDate("");
      setHeure("");
      setSucces("Créneau ajouté au calendrier.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
    }
  }

  function basculer(id: string, libre: boolean) {
    setErreur(null);
    try {
      changerDisponibiliteCreneau(id, libre);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
    }
  }

  if (!pret) return <Squelette lignes={4} />;
  if (!donnees) return <MessageInfo>Aucun centre rattaché à ce compte.</MessageInfo>;

  const { centre, creneaux, libres } = donnees;

  return (
    <>
      <TitreSection aide="Ajoutez vos créneaux libres, puis suivez-les dans le calendrier.">
        Disponibilités
      </TitreSection>

      {/* Résumé du centre */}
      <Carte className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg">{centre.nom}</h2>
            <p className="mt-0.5 text-sm text-sable-600">
              {centre.examens.map((e) => LIBELLE_EXAMEN[e] ?? e).join(" · ")}
            </p>
          </div>
          <div className="flex gap-8">
            <div className="text-right">
              <p className="font-[family-name:var(--font-titre)] text-2xl text-prune-900">
                {libres}
              </p>
              <p className="text-sm text-sable-600">créneaux libres</p>
            </div>
            <div className="text-right">
              <p className="font-[family-name:var(--font-titre)] text-2xl text-prune-900">
                {centre.places_semaine}
              </p>
              <p className="text-sm text-sable-600">places / semaine</p>
            </div>
          </div>
        </div>
      </Carte>

      {/* Ajouter un créneau */}
      <SectionDepliable
        titre="Ajouter un créneau"
        ouvert={ajoutOuvert}
        onBasculer={() => setAjoutOuvert((v) => !v)}
      >
        {erreur ? (
          <p role="alert" className="mb-4 text-sm font-medium text-rouge-fort">
            {erreur}
          </p>
        ) : null}
        {succes ? (
          <div className="mb-4">
            <MessageSucces>{succes}</MessageSucces>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Champ
            type="time"
            label="Heure"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Bouton onClick={ajouter}>Ajouter ce créneau</Bouton>
          <p className="text-sm text-sable-600">Le créneau apparaît dans le calendrier.</p>
        </div>
      </SectionDepliable>

      {/* Calendrier */}
      <SectionDepliable
        titre="Calendrier des rendez-vous"
        ouvert={calendrierOuvert}
        onBasculer={() => setCalendrierOuvert((v) => !v)}
      >
        <AgendaSemaine creneaux={creneaux} onBasculer={basculer} />
      </SectionDepliable>
    </>
  );
}

function SectionDepliable({
  titre,
  ouvert,
  onBasculer,
  children,
}: {
  titre: string;
  ouvert: boolean;
  onBasculer: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-[var(--radius-grand)] border border-sable-200 bg-white">
      <button
        type="button"
        onClick={onBasculer}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-sable-50"
      >
        <span className="text-lg font-medium text-prune-900">{titre}</span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sable-300 text-xl leading-none text-prune-700"
        >
          {ouvert ? "−" : "+"}
        </span>
      </button>
      {ouvert ? (
        <div className="border-t border-sable-200 px-5 py-5">{children}</div>
      ) : null}
    </div>
  );
}
