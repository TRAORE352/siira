"use client";

import { useMemo, useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Champ } from "@/components/Champs";
import { Espace } from "@/components/Espace";
import {
  Carte,
  EtatVide,
  Ligne,
  MessageInfo,
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

  const { donnees, pret } = useDonnees(() => {
    const centre = trouverCentre(centreId);
    if (!centre) return null;
    const maintenant = Date.now();
    const creneaux = lireEtat()
      .creneaux.filter(
        (c) => c.centre_id === centreId && new Date(c.debut).getTime() >= maintenant,
      )
      .sort((a, b) => a.debut.localeCompare(b.debut));
    return { centre, creneaux, libres: creneaux.filter((c) => c.libre).length };
  });

  const jours = useMemo(() => {
    const creneaux = donnees?.creneaux ?? [];
    const parJour = new Map<string, typeof creneaux>();
    for (const c of creneaux) {
      const cle = cleJour(c.debut);
      const liste = parJour.get(cle) ?? [];
      liste.push(c);
      parJour.set(cle, liste);
    }
    return Array.from(parJour.entries());
  }, [donnees]);

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

  const { centre, libres } = donnees;

  return (
    <>
      <TitreSection aide="Ajoutez des créneaux libres et suivez l'état de vos rendez-vous.">
        Disponibilités
      </TitreSection>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div className="flex flex-col gap-4">
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

        <Carte>
          <h2 className="mb-3 text-lg">Agenda des rendez-vous</h2>
          {jours.length === 0 ? (
            <EtatVide
              titre="Aucun rendez-vous à venir"
              texte="Ajoutez un créneau libre pour le voir apparaître ici."
            />
          ) : (
            <div className="flex flex-col gap-5">
              {jours.map(([cle, creneaux]) => (
                <div key={cle}>
                  <p className="mb-2 text-sm font-medium text-prune-800">{libelleJour(cle)}</p>
                  <ul className="flex flex-col divide-y divide-sable-100 overflow-hidden rounded-[var(--radius-moyen)] border border-sable-200">
                    {creneaux.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="text-[0.95rem] text-prune-800">{heureDe(c.debut)}</span>
                        <button
                          type="button"
                          onClick={() => basculer(c.id, !c.libre)}
                          aria-pressed={!c.libre}
                          className={`rounded-full border px-2.5 py-0.5 text-sm font-medium transition-colors ${
                            c.libre
                              ? "border-vert-bord bg-vert-bg text-vert-texte"
                              : "border-sable-300 bg-sable-100 text-sable-700"
                          }`}
                        >
                          {c.libre ? "Libre" : "Pris"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Carte>
      </div>
    </>
  );
}

function cleJour(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function libelleJour(cle: string): string {
  const [a, m, j] = cle.split("-").map(Number);
  const d = new Date(a, m - 1, j);
  const l = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function heureDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
