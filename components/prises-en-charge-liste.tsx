"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DossierCentre } from "@/lib/centre";
import NiveauBadge from "./niveau-badge";
import {
  formatFCFA,
  LIBELLE_STATUT_FINANCEMENT,
  LIBELLE_SOIN,
} from "@/lib/libelles";
import { SOINS_PAR_NIVEAU } from "@/lib/financement";

const BADGE_STATUT: Record<string, string> = {
  proposee: "bg-niveau-orange-fond text-niveau-orange-texte",
  confirmee: "bg-niveau-vert-fond text-niveau-vert-texte",
  refusee: "bg-niveau-rouge-fond text-niveau-rouge-texte",
  retiree: "bg-rose-clair text-texte-secondaire",
};

/** Rubrique « Prises en charge » : demandes de financement du centre, avec
 * l'action d'enregistrer l'accord d'un partenaire ou le refus. */
export default function PrisesEnChargeListe({ dossiers }: { dossiers: DossierCentre[] }) {
  const router = useRouter();
  const [enCoursId, setEnCoursId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const cas = dossiers.filter((d) => d.financements.length > 0);

  async function agir(financementId: string, action: "accorder" | "refuser") {
    setEnCoursId(financementId);
    setErreur(null);
    try {
      const res = await fetch("/api/prise-en-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financementId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue");
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setEnCoursId(null);
    }
  }

  if (cas.length === 0) {
    return (
      <p className="rounded-carte border border-rose-bordure bg-white px-5 py-6 text-sm text-texte-secondaire">
        Aucune demande de prise en charge en cours.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {erreur && <p className="text-sm text-niveau-rouge-texte">{erreur}</p>}

      {cas.map((d) => {
        const soins =
          d.niveauValide === "rouge" || d.niveauValide === "orange"
            ? SOINS_PAR_NIVEAU[d.niveauValide]
            : [];
        return (
          <div
            key={d.orientationId}
            className="rounded-carte border border-rose-bordure bg-white p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-texte-principal">{d.patiente.nom}</span>
                  <NiveauBadge niveau={d.niveauValide} />
                </div>
                <p className="text-sm text-texte-secondaire">
                  {d.patiente.age} ans · {d.patiente.district} · {d.patiente.code}
                </p>
              </div>
              {soins.length > 0 && (
                <p className="text-right text-xs text-texte-secondaire">
                  {soins.map((s) => LIBELLE_SOIN[s]).join(", ")}
                </p>
              )}
            </div>

            <ul className="divide-y divide-rose-bordure">
              {d.financements.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-texte-principal">{f.ongNom}</p>
                    <p className="text-xs text-texte-secondaire">{formatFCFA(f.montant)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        BADGE_STATUT[f.statut] ?? "bg-rose-clair text-texte-secondaire"
                      }`}
                    >
                      {LIBELLE_STATUT_FINANCEMENT[f.statut] ?? f.statut}
                    </span>
                    {f.statut === "proposee" && (
                      <>
                        <button
                          type="button"
                          disabled={enCoursId === f.id}
                          onClick={() => agir(f.id, "accorder")}
                          className="rounded-bouton bg-rose-principal px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-fonce disabled:opacity-60"
                        >
                          Accorder
                        </button>
                        <button
                          type="button"
                          disabled={enCoursId === f.id}
                          onClick={() => agir(f.id, "refuser")}
                          className="rounded-bouton border border-rose-bordure px-3 py-1.5 text-xs font-semibold text-texte-principal hover:bg-rose-clair disabled:opacity-60"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
