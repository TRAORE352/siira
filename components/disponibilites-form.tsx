"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CentreInfo } from "@/lib/centre";

const EXAMENS = [
  { id: "echographie", label: "Échographie mammaire" },
  { id: "mammographie", label: "Mammographie" },
  { id: "biopsie", label: "Biopsie" },
];

/** Rubrique « Disponibilités » (exigence CE-08) : examens proposés et places. */
export default function DisponibilitesForm({
  centre,
  placesLibres,
}: {
  centre: CentreInfo;
  placesLibres: number;
}) {
  const router = useRouter();
  const [examens, setExamens] = useState<string[]>(centre.examens);
  const [places, setPlaces] = useState(centre.placesSemaine);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  function basculer(id: string) {
    setExamens((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch("/api/disponibilites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examens, placesSemaine: places }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue");
      setMessage({ type: "ok", texte: "Disponibilités enregistrées." });
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
    <form onSubmit={enregistrer} className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-texte-principal">Examens proposés</h3>
        <div className="space-y-2">
          {EXAMENS.map((examen) => (
            <label key={examen.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={examens.includes(examen.id)}
                onChange={() => basculer(examen.id)}
                className="h-4 w-4 accent-rose-principal"
              />
              {examen.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-texte-principal">
            Places par semaine
          </span>
          <input
            type="number"
            min={0}
            value={places}
            onChange={(e) => setPlaces(Number(e.target.value))}
            className="rounded-champ border border-rose-bordure bg-white px-3 py-2 text-sm"
          />
        </label>

        <p className="text-sm text-texte-secondaire">
          Créneaux libres dans les 7 prochains jours :{" "}
          <span className="font-semibold text-texte-principal">{placesLibres}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-bouton bg-rose-principal px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-fonce disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
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
