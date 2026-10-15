"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Espace } from "@/components/Espace";
import { Carte, EtatVide, Squelette, TitreSection } from "@/components/Interface";
import { listerDossiersCentre } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_ORIENTATION, dateCourte } from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import { useSession } from "@/lib/session";
import type { Niveau } from "@/lib/types";

const STATUTS: string[] = ["envoyee", "recue", "examens", "resultat", "close", "absente"];

export default function ListePatientes() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const centreId = profil?.centre_id ?? "";
  const [niveau, setNiveau] = useState<"tous" | Niveau>("tous");
  const [statut, setStatut] = useState<string>("tous");

  const { donnees, pret } = useDonnees(() =>
    centreId ? listerDossiersCentre(centreId) : [],
  );

  const dossiers = useMemo(() => donnees ?? [], [donnees]);

  const compteurs = useMemo(() => {
    const c = { tous: dossiers.length, rouge: 0, orange: 0, vert: 0 };
    for (const d of dossiers) {
      const n = d.consultation.niveau_valide;
      if (n) c[n] += 1;
    }
    return c;
  }, [dossiers]);

  const visibles = useMemo(
    () =>
      dossiers.filter(
        (d) =>
          (niveau === "tous" || d.consultation.niveau_valide === niveau) &&
          (statut === "tous" || d.orientation.statut === statut),
      ),
    [dossiers, niveau, statut],
  );

  if (!pret) return <Squelette lignes={4} />;

  return (
    <>
      <TitreSection aide="Les patientes orientées vers votre centre. Les cas rouges apparaissent en premier.">
        Patientes
      </TitreSection>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par niveau">
        {(["tous", "rouge", "orange", "vert"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setNiveau(f)}
            aria-pressed={niveau === f}
            className={`flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border px-3 text-[0.95rem] transition-colors ${
              niveau === f
                ? "border-rose-600 bg-rose-50 font-medium text-rose-700"
                : "border-sable-300 bg-white text-prune-800 hover:bg-sable-100"
            }`}
          >
            {f === "tous" ? "Toutes" : f[0].toUpperCase() + f.slice(1)} ({compteurs[f]})
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        <button
          type="button"
          onClick={() => setStatut("tous")}
          aria-pressed={statut === "tous"}
          className={`flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border px-3 text-[0.95rem] transition-colors ${
            statut === "tous"
              ? "border-rose-600 bg-rose-50 font-medium text-rose-700"
              : "border-sable-300 bg-white text-prune-800 hover:bg-sable-100"
          }`}
        >
          Tous les statuts
        </button>
        {STATUTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatut(s)}
            aria-pressed={statut === s}
            className={`flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border px-3 text-[0.95rem] transition-colors ${
              statut === s
                ? "border-rose-600 bg-rose-50 font-medium text-rose-700"
                : "border-sable-300 bg-white text-prune-800 hover:bg-sable-100"
            }`}
          >
            {LIBELLE_STATUT_ORIENTATION[s as keyof typeof LIBELLE_STATUT_ORIENTATION]}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <EtatVide
          titre="Aucune patiente"
          texte="Aucun dossier ne correspond à ces filtres pour le moment."
        />
      ) : (
        <>
          {/* Tableau sur ordinateur */}
          <div className="hidden overflow-hidden rounded-[var(--radius-grand)] border border-sable-200 bg-white md:block">
            <table className="w-full border-collapse text-left">
              <caption className="lecteur-seul">Patientes orientées vers votre centre</caption>
              <thead>
                <tr className="border-b border-sable-200 bg-sable-100">
                  <Th>Patiente</Th>
                  <Th>District</Th>
                  <Th>Niveau</Th>
                  <Th>Rendez-vous</Th>
                  <Th>État</Th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((d) => (
                  <tr
                    key={d.orientation.id}
                    className="border-b border-sable-100 last:border-0 hover:bg-sable-50"
                  >
                    <Td>
                      <Link
                        href={`/centre/patientes/${d.orientation.id}`}
                        className="flex min-h-[var(--spacing-cible)] flex-col justify-center underline-offset-4 hover:text-rose-700"
                      >
                        <span className="font-medium text-prune-900 hover:underline">
                          {d.patiente.nom}
                        </span>
                        <span className="text-sm text-sable-600">{d.patiente.age} ans</span>
                      </Link>
                    </Td>
                    <Td>{d.district?.nom ?? "—"}</Td>
                    <Td>
                      {d.consultation.niveau_valide ? (
                        <BadgeNiveau niveau={d.consultation.niveau_valide} taille="petit" />
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{d.creneau ? dateCourte(d.creneau.debut) : "—"}</Td>
                    <Td>{LIBELLE_STATUT_ORIENTATION[d.orientation.statut]}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartes sur petit écran */}
          <ul className="flex flex-col gap-3 md:hidden">
            {visibles.map((d) => (
              <li key={d.orientation.id}>
                <Carte className="p-0">
                  <Link
                    href={`/centre/patientes/${d.orientation.id}`}
                    className="block rounded-[var(--radius-grand)] p-4 hover:bg-sable-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-prune-900">{d.patiente.nom}</p>
                        <p className="text-sm text-sable-600">
                          {d.patiente.age} ans · {d.district?.nom ?? "—"}
                        </p>
                      </div>
                      {d.consultation.niveau_valide ? (
                        <BadgeNiveau niveau={d.consultation.niveau_valide} />
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-sable-600">
                      {d.creneau ? dateCourte(d.creneau.debut) : "Sans rendez-vous"} ·{" "}
                      {LIBELLE_STATUT_ORIENTATION[d.orientation.statut]}
                    </p>
                  </Link>
                </Carte>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 text-sm font-medium text-sable-700">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-[0.95rem] text-prune-800">{children}</td>;
}
