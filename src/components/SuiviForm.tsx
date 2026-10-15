"use client";

import { useState } from "react";
import { Bouton } from "./Bouton";
import { Liste, ZoneTexte } from "./Champs";
import { MessageErreur, MessageSucces } from "./Interface";
import { enregistrerSuivi } from "@/lib/data";
import { LIBELLE_ETAPE, LIBELLE_RESULTAT } from "@/lib/libelles";
import type { EtapeSuivi, ResultatSuivi } from "@/lib/types";

/**
 * Formulaire de suivi des soins : l'étape atteinte, le résultat et une note.
 * Réutilisé par l'écran « Suivi des soins ».
 */
export function SuiviForm({
  orientationId,
  auteurId,
}: {
  orientationId: string;
  auteurId: string;
}) {
  const [etape, setEtape] = useState<EtapeSuivi | "">("");
  const [resultat, setResultat] = useState<ResultatSuivi>("en_attente");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function enregistrer() {
    setErreur(null);
    setSucces(null);
    if (!etape) {
      setErreur("Choisissez l'étape atteinte.");
      return;
    }
    setEnvoi(true);
    try {
      enregistrerSuivi({
        orientation_id: orientationId,
        etape: etape as EtapeSuivi,
        resultat,
        note: note.trim() || null,
        auteur_id: auteurId,
      });
      setSucces("La suite donnée est enregistrée. L'agent la voit aussitôt.");
      setNote("");
      setEtape("");
      setResultat("en_attente");
    } catch {
      setErreur("L'enregistrement n'a pas abouti. Recommencez.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {erreur ? <MessageErreur texte={erreur} /> : null}
      {succes ? <MessageSucces>{succes}</MessageSucces> : null}

      <Liste
        label="Étape atteinte"
        obligatoire
        placeholder="Choisissez une étape"
        options={(["recue", "examens", "resultat", "absente"] as EtapeSuivi[]).map(
          (e) => ({ valeur: e, libelle: LIBELLE_ETAPE[e] }),
        )}
        value={etape}
        onChange={(e) => setEtape(e.target.value as EtapeSuivi)}
      />

      {etape === "resultat" ? (
        <Liste
          label="Résultat"
          options={(
            ["benin", "a_surveiller", "cancer_confirme"] as ResultatSuivi[]
          ).map((r) => ({ valeur: r, libelle: LIBELLE_RESULTAT[r] }))}
          value={resultat === "en_attente" ? "" : resultat}
          placeholder="Choisissez un résultat"
          onChange={(e) => setResultat(e.target.value as ResultatSuivi)}
        />
      ) : null}

      <ZoneTexte label="Note" value={note} onChange={(e) => setNote(e.target.value)} />

      <Bouton onClick={enregistrer} chargement={envoi}>
        Enregistrer
      </Bouton>
    </div>
  );
}
