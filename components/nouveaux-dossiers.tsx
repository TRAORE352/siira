"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import NiveauBadge from "./niveau-badge";

export interface NouveauDossier {
  id: string;
  nom: string;
  age: number;
  code: string;
  niveau: string | null;
  rendezVous: string | null;
}

interface DossierRealtime {
  id: string;
  creneaux: { debut: string | null } | null;
  consultations: {
    niveau_valide: string | null;
    patientes: { nom: string | null; age: number | null; code: string | null } | null;
  } | null;
}

/**
 * « Nouveaux dossiers reçus en direct » : s'abonne à Supabase Realtime sur la
 * table orientations (INSERT et passage à « envoyee ») pour le centre connecté,
 * et surligne chaque nouveau dossier pendant 5 secondes (exigence CE-04).
 */
export default function NouveauxDossiers({
  centreId,
  initiaux,
}: {
  centreId: string;
  initiaux: NouveauDossier[];
}) {
  const [liste, setListe] = useState<NouveauDossier[]>(initiaux);
  const [surlignes, setSurlignes] = useState<Set<string>>(new Set());

  const configure = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  useEffect(() => {
    if (!configure) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`nouveaux-dossiers-${centreId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orientations",
          filter: `centre_id=eq.${centreId}`,
        },
        async (payload) => {
          const ligne = payload.new as { id: string; statut?: string } | null;
          if (!ligne || ligne.statut !== "envoyee") return;

          const { data } = await supabase
            .from("orientations")
            .select(
              "id, envoyee_le, creneaux(debut), consultations(niveau_valide, patientes(nom, age, code))",
            )
            .eq("id", ligne.id)
            .single();

          if (!data) return;
          const detail = data as unknown as DossierRealtime;
          const patiente = detail.consultations?.patientes;
          const creneau = detail.creneaux;

          const nouveau: NouveauDossier = {
            id: detail.id,
            nom: patiente?.nom ?? "—",
            age: patiente?.age ?? 0,
            code: patiente?.code ?? "—",
            niveau: detail.consultations?.niveau_valide ?? null,
            rendezVous: creneau?.debut ?? null,
          };

          setListe((prev) => [nouveau, ...prev.filter((x) => x.id !== nouveau.id)]);
          setSurlignes((prev) => new Set(prev).add(nouveau.id));
          setTimeout(() => {
            setSurlignes((prev) => {
              const suivant = new Set(prev);
              suivant.delete(nouveau.id);
              return suivant;
            });
          }, 5000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centreId, configure]);

  if (liste.length === 0) {
    return (
      <p className="rounded-carte border border-rose-bordure bg-white px-5 py-6 text-sm text-texte-secondaire">
        Aucun dossier reçu récemment. Les nouveaux dossiers apparaîtront ici en direct.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {liste.map((d) => (
        <li key={d.id}>
          <Link
            href={`/centre/patientes/${d.id}`}
            className={`flex items-center justify-between gap-3 rounded-carte border px-4 py-3 transition-colors ${
              surlignes.has(d.id)
                ? "border-rose-principal bg-rose-clair"
                : "border-rose-bordure bg-white hover:border-rose-principal"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-texte-principal">{d.nom}</span>
                <NiveauBadge niveau={d.niveau} />
              </div>
              <p className="text-xs text-texte-secondaire">
                {d.age} ans · {d.code}
                {d.rendezVous ? ` · ${formatDate(d.rendezVous)}` : ""}
              </p>
            </div>
            {surlignes.has(d.id) && (
              <span className="shrink-0 rounded-full bg-rose-principal px-2 py-0.5 text-xs font-semibold text-white">
                Nouveau
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
