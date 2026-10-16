"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Champ, Liste } from "@/components/Champs";
import { Espace } from "@/components/Espace";
import { Carte, EtatVide, Squelette, TitreSection } from "@/components/Interface";
import { listerDossiersCentre } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_ORIENTATION, dateCourte, normaliserTexte } from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import { useSession } from "@/lib/session";
import type { Niveau } from "@/lib/types";

const STATUTS: string[] = ["recue", "examens", "resultat", "close", "absente"];

const POINT_NIVEAU: Record<Niveau, string> = {
  rouge: "bg-rouge-fort",
  orange: "bg-orange-fort",
  vert: "bg-vert-fort",
};

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
  const [recherche, setRecherche] = useState("");

  const { donnees, pret } = useDonnees(() =>
    centreId ? listerDossiersCentre(centreId) : [],
  );

  const dossiers = useMemo(() => donnees ?? [], [donnees]);

  const visibles = useMemo(() => {
    const q = normaliserTexte(recherche);
    return dossiers.filter(
      (d) =>
        (niveau === "tous" || d.consultation.niveau_valide === niveau) &&
        (statut === "tous" || d.orientation.statut === statut) &&
        (!q || normaliserTexte(d.patiente.nom).includes(q)),
    );
  }, [dossiers, niveau, statut, recherche]);

  if (!pret) return <Squelette lignes={4} />;

  return (
    <>
      <TitreSection aide="Les patientes orientées vers votre centre. Les cas rouges apparaissent en premier.">
        Patientes
      </TitreSection>

      <Champ
        label="Rechercher une patiente"
        labelMasque
        placeholder="Rechercher une patiente…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="mb-4 max-w-md"
      />

      <div className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-4 rounded-[var(--radius-grand)] border border-sable-200 bg-white px-4 py-4">
        <div className="flex flex-col gap-2">
          <span className="text-[0.95rem] font-medium text-prune-800">Niveau d&apos;urgence</span>
          <div
            role="group"
            aria-label="Filtrer par niveau d'urgence"
            className="inline-flex rounded-[var(--radius-moyen)] border border-sable-300 bg-white p-0.5"
          >
            {(["tous", "rouge", "orange", "vert"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setNiveau(f)}
                aria-pressed={niveau === f}
                className={`flex min-h-[var(--spacing-cible)] items-center gap-1.5 rounded-[calc(var(--radius-moyen)-2px)] px-3.5 text-sm transition-colors ${
                  niveau === f
                    ? "bg-prune-900 font-medium text-white"
                    : "text-prune-800 hover:bg-sable-100"
                }`}
              >
                {f !== "tous" ? (
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${POINT_NIVEAU[f]}`} />
                ) : null}
                {f === "tous" ? "Toutes" : f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="w-52">
          <Liste
            label="Statut"
            options={[
              { valeur: "tous", libelle: "Tous les statuts" },
              ...STATUTS.map((s) => ({
                valeur: s,
                libelle: LIBELLE_STATUT_ORIENTATION[s as keyof typeof LIBELLE_STATUT_ORIENTATION],
              })),
            ]}
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
          />
        </div>

        <div className="ml-auto flex items-center gap-4 pb-1.5">
          {niveau !== "tous" || statut !== "tous" ? (
            <button
              type="button"
              onClick={() => {
                setNiveau("tous");
                setStatut("tous");
              }}
              className="text-sm font-medium text-rose-700 underline-offset-4 hover:underline"
            >
              Effacer les filtres
            </button>
          ) : null}
          <span className="text-sm text-sable-600" aria-live="polite">
            {visibles.length} patiente{visibles.length > 1 ? "s" : ""}
          </span>
        </div>
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
