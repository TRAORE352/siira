"use client";

import Link from "next/link";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Espace } from "@/components/Espace";
import { Carte, EtatVide, Squelette, TitreSection } from "@/components/Interface";
import { listerDossiersCentre, listerPrisesEnCharge } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { dateCourte } from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import { useNouveautes } from "@/lib/nouveautes";
import { useSession } from "@/lib/session";

export default function TableauDeBord() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const centreId = profil?.centre_id ?? "";

  const { donnees, pret } = useDonnees(() => {
    const dossiers = centreId ? listerDossiersCentre(centreId) : [];
    const finSemaine = Date.now() + 7 * 86400000;
    let rdvSemaine = 0;
    let rougesEnAttente = 0;
    for (const d of dossiers) {
      if (
        d.creneau &&
        new Date(d.creneau.debut).getTime() <= finSemaine &&
        d.orientation.statut !== "absente" &&
        d.orientation.statut !== "close"
      ) {
        rdvSemaine += 1;
      }
      if (
        d.consultation.niveau_valide === "rouge" &&
        ["envoyee", "recue", "examens"].includes(d.orientation.statut)
      ) {
        rougesEnAttente += 1;
      }
    }
    const prises = centreId ? listerPrisesEnCharge(centreId) : [];
    const prisesEnChargeADemander = prises.reduce(
      (n, p) =>
        n + p.demandes.filter((x) => x.financement.statut === "proposee").length,
      0,
    );
    const recus = dossiers.filter((d) => d.orientation.statut === "envoyee");
    return { rdvSemaine, rougesEnAttente, prisesEnChargeADemander, recus };
  });

  const recus = donnees?.recus ?? [];
  const nouveaux = useNouveautes(recus.map((x) => x.orientation.id));

  if (!pret) return <Squelette lignes={4} />;

  const indicateurs = donnees ?? {
    rdvSemaine: 0,
    rougesEnAttente: 0,
    prisesEnChargeADemander: 0,
    recus: [],
  };

  return (
    <>
      <TitreSection aide="Les rendez-vous de la semaine, les cas à traiter et les dossiers qui viennent d'arriver.">
        Tableau de bord
      </TitreSection>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Indicateur libelle="Rendez-vous de la semaine" valeur={indicateurs.rdvSemaine} />
        <Indicateur libelle="Cas rouges en attente" valeur={indicateurs.rougesEnAttente} />
        <Indicateur
          libelle="Prises en charge à demander"
          valeur={indicateurs.prisesEnChargeADemander}
        />
      </div>

      <h2 className="mb-3 text-lg">Nouveaux dossiers reçus en direct</h2>

      {recus.length === 0 ? (
        <EtatVide
          titre="Aucun nouveau dossier"
          texte="Les dossiers envoyés par les agents de santé apparaissent ici dès leur arrivée."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {recus.map((d) => (
            <li key={d.orientation.id}>
              <Link
                href={`/centre/patientes/${d.orientation.id}`}
                className={`block rounded-[var(--radius-grand)] border border-sable-200 bg-white p-4 transition-colors hover:bg-sable-100 ${
                  nouveaux.has(d.orientation.id) ? "signal-nouveau" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-prune-900">{d.patiente.nom}</span>
                      {d.consultation.niveau_valide ? (
                        <BadgeNiveau niveau={d.consultation.niveau_valide} taille="petit" />
                      ) : null}
                    </div>
                    <p className="text-sm text-sable-600">
                      {d.patiente.age} ans · {d.district?.nom ?? "—"}
                    </p>
                  </div>
                  <span className="text-sm text-sable-600">
                    {d.creneau ? dateCourte(d.creneau.debut) : "Sans rendez-vous"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
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
