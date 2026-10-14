"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Espace } from "@/components/Espace";
import { Carte, EtatVide, Squelette, TitreSection } from "@/components/Interface";
import { listerDossiersCentre } from "@/lib/data";
import type { DossierCentre } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_ORIENTATION, dateCourte } from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import { useNouveautes } from "@/lib/nouveautes";
import { useSession } from "@/lib/session";
import type { Niveau } from "@/lib/types";

export default function ListeCentre() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

type FiltreNiveau = "tous" | Niveau;

function Contenu() {
  const { profil } = useSession();
  const centreId = profil?.centre_id ?? "";
  const [filtre, setFiltre] = useState<FiltreNiveau>("tous");

  // Les indicateurs dépendent de l'heure courante : ils sont calculés avec
  // les données, jamais pendant le rendu.
  const { donnees, pret } = useDonnees(() => {
    const liste: DossierCentre[] = centreId ? listerDossiersCentre(centreId) : [];
    const finSemaine = Date.now() + 7 * 86400000;
    let rdvSemaine = 0;
    let rougesEnAttente = 0;
    let finances = 0;
    for (const d of liste) {
      if (d.creneau && new Date(d.creneau.debut).getTime() <= finSemaine)
        rdvSemaine += 1;
      if (
        d.consultation.niveau_valide === "rouge" &&
        d.orientation.statut === "envoyee"
      )
        rougesEnAttente += 1;
      if (d.financement?.statut === "confirmee") finances += 1;
    }
    return { liste, indicateurs: { rdvSemaine, rougesEnAttente, finances } };
  });

  const dossiers = useMemo(() => donnees?.liste ?? [], [donnees]);
  const indicateurs = donnees?.indicateurs ?? {
    rdvSemaine: 0,
    rougesEnAttente: 0,
    finances: 0,
  };

  const compteurs = useMemo(() => {
    const c = { tous: dossiers.length, rouge: 0, orange: 0, vert: 0 };
    for (const d of dossiers) {
      const n = d.consultation.niveau_valide;
      if (n) c[n] += 1;
    }
    return c;
  }, [dossiers]);

  const visibles =
    filtre === "tous"
      ? dossiers
      : dossiers.filter((d) => d.consultation.niveau_valide === filtre);

  // Un dossier qui vient d'arriver est mis en évidence quelques secondes.
  const nouveaux = useNouveautes(dossiers.map((d) => d.orientation.id));

  return (
    <>
      <TitreSection aide="Les patientes orientées vers votre centre. Les cas rouges apparaissent en premier.">
        Patientes reçues
      </TitreSection>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Indicateur libelle="Rendez-vous cette semaine" valeur={indicateurs.rdvSemaine} />
        <Indicateur libelle="Cas rouges en attente" valeur={indicateurs.rougesEnAttente} />
        <Indicateur libelle="Soins financés" valeur={indicateurs.finances} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par niveau">
        {(["tous", "rouge", "orange", "vert"] as FiltreNiveau[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltre(f)}
            aria-pressed={filtre === f}
            className={`flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border px-3 text-[0.95rem] transition-colors ${
              filtre === f
                ? "border-rose-600 bg-rose-50 font-medium text-rose-700"
                : "border-sable-300 bg-white text-prune-800 hover:bg-sable-100"
            }`}
          >
            {f === "tous" ? "Toutes" : f[0].toUpperCase() + f.slice(1)} (
            {compteurs[f]})
          </button>
        ))}
      </div>

      {!pret ? (
        <Squelette lignes={4} />
      ) : visibles.length === 0 ? (
        <EtatVide
          titre="Aucune patiente pour le moment"
          texte="Les dossiers envoyés par les agents de santé apparaissent ici dès leur arrivée."
        />
      ) : (
        <>
          {/* Tableau sur ordinateur */}
          <div className="hidden overflow-hidden rounded-[var(--radius-grand)] border border-sable-200 bg-white md:block">
            <table className="w-full border-collapse text-left">
              <caption className="lecteur-seul">
                Patientes orientées vers votre centre
              </caption>
              <thead>
                <tr className="border-b border-sable-200 bg-sable-100">
                  <Th>Patiente</Th>
                  <Th>District</Th>
                  <Th>Niveau</Th>
                  <Th>Rendez-vous</Th>
                  <Th>Financement</Th>
                  <Th>État</Th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((d) => (
                  <tr
                    key={d.orientation.id}
                    className={`border-b border-sable-100 last:border-0 hover:bg-sable-50 ${
                      nouveaux.has(d.orientation.id) ? "signal-nouveau" : ""
                    }`}
                  >
                    <Td>
                      <Link
                        href={`/centre/dossier/${d.orientation.id}`}
                        className="font-medium text-prune-900 underline-offset-4 hover:text-rose-700 hover:underline"
                      >
                        {d.patiente.nom}
                      </Link>
                      <span className="block text-sm text-sable-600">
                        {d.patiente.age} ans
                      </span>
                    </Td>
                    <Td>{d.district?.nom ?? "—"}</Td>
                    <Td>
                      {d.consultation.niveau_valide ? (
                        <BadgeNiveau
                          niveau={d.consultation.niveau_valide}
                          taille="petit"
                        />
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{d.creneau ? dateCourte(d.creneau.debut) : "—"}</Td>
                    <Td>
                      {d.financement?.statut === "confirmee" ? "Financé" : "En attente"}
                    </Td>
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
                <Carte className={`p-0 ${nouveaux.has(d.orientation.id) ? "signal-nouveau" : ""}`}>
                  <Link
                    href={`/centre/dossier/${d.orientation.id}`}
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

function Indicateur({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <Carte>
      <p className="text-sm text-sable-600">{libelle}</p>
      <p className="mt-1 font-[family-name:var(--font-titre)] text-3xl text-prune-900">
        {valeur}
      </p>
    </Carte>
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
