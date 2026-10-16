"use client";

import { useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Champ, Liste } from "@/components/Champs";
import { Espace } from "@/components/Espace";
import {
  Carte,
  Ligne,
  MessageInfo,
  MessageSucces,
  Squelette,
  TitreSection,
} from "@/components/Interface";
import { listerCentres } from "@/lib/data";
import { LIENS_CENTRE } from "@/lib/nav";
import { LIBELLE_ROLE, mettreAJourCompte, useSession } from "@/lib/session";
import type { Profil } from "@/lib/types";

const SPECIALITES = [
  "Gynécologue",
  "Radiologue",
  "Sage-femme",
  "Médecin généraliste",
  "Infirmier·ère",
  "Oncologue",
  "Autre",
];

const OPTIONS_SEXE = [
  { valeur: "femme", libelle: "Femme" },
  { valeur: "homme", libelle: "Homme" },
];

export default function Compte() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil, pret } = useSession();
  if (!pret) return <Squelette lignes={4} />;
  if (!profil) return <MessageInfo>Aucun compte connecté.</MessageInfo>;
  return <Parametres profil={profil} />;
}

function Parametres({ profil: profilInitial }: { profil: Profil }) {
  const [profil, setProfil] = useState(profilInitial);
  const [telephone, setTelephone] = useState(profilInitial.telephone ?? "");
  const [specialite, setSpecialite] = useState(profilInitial.specialite ?? "");
  const [sexe, setSexe] = useState(profilInitial.sexe ?? "");
  const [centreId, setCentreId] = useState(profilInitial.centre_id ?? "");
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const centres = listerCentres();

  function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);

    const centre = centres.find((c) => c.id === centreId);
    const misAJour = mettreAJourCompte(profil.id, {
      telephone: telephone.trim() || undefined,
      specialite: specialite || undefined,
      sexe: (sexe || undefined) as "femme" | "homme" | undefined,
      centre_id: centreId || null,
      centre_sante: centre?.nom ?? null,
    });

    if (!misAJour) {
      setErreur(
        "Impossible d'enregistrer : ce compte de démonstration ne peut pas être modifié.",
      );
      return;
    }
    setProfil(misAJour);
    setSucces("Vos informations ont été enregistrées.");
  }

  return (
    <>
      <TitreSection aide="Votre profil et vos paramètres personnels.">
        Compte
      </TitreSection>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Informations, en lecture seule */}
        <Carte>
          <h2 className="mb-3 text-lg">Informations</h2>
          <dl>
            <Ligne libelle="Nom">{profil.nom}</Ligne>
            <Ligne libelle="Matricule">{profil.matricule ?? "—"}</Ligne>
            <Ligne libelle="Rôle">{LIBELLE_ROLE[profil.role]}</Ligne>
          </dl>
        </Carte>

        {/* Paramètres, modifiables */}
        <Carte>
          <h2 className="mb-1 text-lg">Paramètres</h2>
          <p className="mb-4 text-sm text-sable-600">
            Modifiez vos informations personnelles, puis enregistrez.
          </p>

          <form onSubmit={enregistrer} className="flex flex-col gap-4">
            {erreur ? (
              <p role="alert" className="text-sm font-medium text-rouge-fort">
                {erreur}
              </p>
            ) : null}
            {succes ? <MessageSucces>{succes}</MessageSucces> : null}

            <Champ
              label="Numéro de téléphone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="70 12 34 56"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />

            <Liste
              label="Spécialité"
              placeholder="Choisir votre spécialité"
              options={SPECIALITES.map((s) => ({ valeur: s, libelle: s }))}
              value={specialite}
              onChange={(e) => setSpecialite(e.target.value)}
            />

            <Liste
              label="Sexe"
              placeholder="Choisir"
              options={OPTIONS_SEXE}
              value={sexe}
              onChange={(e) => setSexe(e.target.value)}
            />

            <Liste
              label="Centre de rattachement"
              placeholder="Choisir votre centre"
              options={centres.map((c) => ({ valeur: c.id, libelle: c.nom }))}
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
            />

            <Bouton type="submit" taille="grand" className="w-full sm:w-auto">
              Enregistrer les modifications
            </Bouton>
          </form>
        </Carte>
      </div>
    </>
  );
}
