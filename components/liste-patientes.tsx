"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DossierCentre } from "@/lib/centre";
import NiveauBadge from "./niveau-badge";
import { LIBELLE_STATUT_ORIENTATION } from "@/lib/libelles";

const ORDRE_NIVEAU: Record<string, number> = { rouge: 0, orange: 1, vert: 2 };

/** Liste des patientes reçues, cas rouges en premier, filtrable par niveau et
 * statut (exigences CE-01, CE-02, CE-03). */
export default function ListePatientes({ dossiers }: { dossiers: DossierCentre[] }) {
  const [niveau, setNiveau] = useState("tous");
  const [statut, setStatut] = useState("tous");

  const statuts = useMemo(() => {
    const ensemble = new Set(dossiers.map((d) => d.statut));
    return ["tous", ...Array.from(ensemble)];
  }, [dossiers]);

  const filtres = useMemo(() => {
    const liste = dossiers.filter(
      (d) =>
        (niveau === "tous" || d.niveauValide === niveau) &&
        (statut === "tous" || d.statut === statut),
    );
    liste.sort((a, b) => {
      const na = ORDRE_NIVEAU[a.niveauValide ?? ""] ?? 3;
      const nb = ORDRE_NIVEAU[b.niveauValide ?? ""] ?? 3;
      if (na !== nb) return na - nb;
      const ta = a.rendezVous ? new Date(a.rendezVous).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.rendezVous ? new Date(b.rendezVous).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });
    return liste;
  }, [dossiers, niveau, statut]);

  const libelle = (d: DossierCentre) => LIBELLE_STATUT_ORIENTATION[d.statut] ?? d.statut;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          className="rounded-champ border border-rose-bordure px-3 py-2 text-sm"
        >
          <option value="tous">Tous les niveaux</option>
          <option value="rouge">Rouge</option>
          <option value="orange">Orange</option>
          <option value="vert">Vert</option>
        </select>

        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="rounded-champ border border-rose-bordure px-3 py-2 text-sm"
        >
          <option value="tous">Tous les statuts</option>
          {statuts
            .filter((s) => s !== "tous")
            .map((s) => (
              <option key={s} value={s}>
                {LIBELLE_STATUT_ORIENTATION[s] ?? s}
              </option>
            ))}
        </select>

        <span className="self-center text-sm text-texte-secondaire">
          {filtres.length} dossier{filtres.length > 1 ? "s" : ""}
        </span>
      </div>

      {filtres.length === 0 ? (
        <p className="rounded-carte border border-rose-bordure bg-rose-clair px-5 py-6 text-sm text-texte-secondaire">
          Aucune patiente ne correspond à ces filtres.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtres.map((d) => (
            <li key={d.orientationId}>
              <Link
                href={`/centre/patientes/${d.orientationId}`}
                className="flex items-center justify-between gap-4 rounded-carte border border-rose-bordure bg-white px-5 py-4 hover:border-rose-principal"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-texte-principal">
                      {d.patiente.nom}
                    </span>
                    <NiveauBadge niveau={d.niveauValide} />
                  </div>
                  <p className="mt-1 text-sm text-texte-secondaire">
                    {d.patiente.age} ans · {d.patiente.district}
                    {d.rendezVous ? ` · RDV ${formatDate(d.rendezVous)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-texte-secondaire">{libelle(d)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
