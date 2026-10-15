"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DossierCentre } from "@/lib/centre";
import { LIBELLE_ETAPE, LIBELLE_RESULTAT } from "@/lib/libelles";

const ETAPES = ["recue", "examens", "resultat", "absente"];
const RESULTATS = ["en_attente", "benin", "a_surveiller", "cancer_confirme"];

function etapeDefaut(statut: string): string {
  if (statut === "examens") return "examens";
  if (statut === "resultat") return "resultat";
  if (statut === "absente") return "absente";
  return "recue";
}

/** Formulaire de suivi des soins (exigence CE-07) : étape, résultat, note. */
export default function SuiviForm({ dossier }: { dossier: DossierCentre }) {
  const router = useRouter();
  const [etape, setEtape] = useState(etapeDefaut(dossier.statut));
  const [resultat, setResultat] = useState("en_attente");
  const [note, setNote] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch("/api/suivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orientationId: dossier.orientationId,
          etape,
          resultat,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue");
      setMessage({ type: "ok", texte: "Suivi enregistré." });
      setNote("");
      router.refresh();
    } catch (err) {
      setMessage({
        type: "erreur",
        texte: err instanceof Error ? err.message : "Une erreur est survenue",
      });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={enregistrer} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-texte-secondaire">Étape</span>
          <select
            value={etape}
            onChange={(e) => setEtape(e.target.value)}
            className="w-full rounded-champ border border-rose-bordure bg-white px-3 py-2 text-sm"
          >
            {ETAPES.map((e) => (
              <option key={e} value={e}>
                {LIBELLE_ETAPE[e]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-texte-secondaire">Résultat</span>
          <select
            value={resultat}
            onChange={(e) => setResultat(e.target.value)}
            className="w-full rounded-champ border border-rose-bordure bg-white px-3 py-2 text-sm"
          >
            {RESULTATS.map((r) => (
              <option key={r} value={r}>
                {LIBELLE_RESULTAT[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-texte-secondaire">
          Note pour l&apos;agent
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Note visible par l'agent de santé…"
          className="w-full rounded-champ border border-rose-bordure bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-bouton bg-rose-principal px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-fonce disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer le suivi"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === "ok" ? "text-niveau-vert-texte" : "text-niveau-rouge-texte"
            }`}
          >
            {message.texte}
          </span>
        )}
      </div>
    </form>
  );
}
