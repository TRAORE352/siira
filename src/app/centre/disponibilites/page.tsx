"use client";

import { useState } from "react";
import { AgendaSemaine } from "@/components/AgendaSemaine";
import { Bouton } from "@/components/Bouton";
import { Champ } from "@/components/Champs";
import { Espace } from "@/components/Espace";
import { Carte, Ligne, MessageInfo, Squelette, TitreSection } from "@/components/Interface";
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
      <TitreSection aide="Ajoutez des créneaux libres et suivez l'état de vos rendez-vous.">
        Disponibilités
      </TitreSection>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Carte>
          <h2 className="mb-3 text-lg">{centre.nom}</h2>
          <dl>
            <Ligne libelle="Service">{centre.service}</Ligne>
            <Ligne libelle="Examens proposés">
              {centre.examens.map((e) => LIBELLE_EXAMEN[e] ?? e).join(", ")}
            </Ligne>
            <Ligne libelle="Places par semaine">{centre.places_semaine}</Ligne>
            <Ligne libelle="Créneaux libres à venir">{libres}</Ligne>
          </dl>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Ajouter un rendez-vous</h2>
          {erreur ? (
            <p role="alert" className="mb-3 text-sm font-medium text-rouge-fort">
              {erreur}
            </p>
          ) : null}
          <div className="flex flex-col gap-4">
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
            <Bouton onClick={ajouter}>Ajouter le créneau</Bouton>
          </div>
        </Carte>
      </div>

      <div className="mt-4">
        <Carte>
          <h2 className="mb-1 text-lg">Agenda des rendez-vous</h2>
          <p className="mb-4 text-sm text-sable-600">
            Cliquez sur un créneau pour le marquer libre ou pris.
          </p>
          <AgendaSemaine creneaux={creneaux} onBasculer={basculer} />
        </Carte>
      </div>
    </>
  );
}
