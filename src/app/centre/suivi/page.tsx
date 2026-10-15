"use client";

import Link from "next/link";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Espace } from "@/components/Espace";
import { Carte, EtatVide, Squelette, TitreSection } from "@/components/Interface";
import { SuiviForm } from "@/components/SuiviForm";
import { listerDossiersCentre } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_ORIENTATION, dateCourte } from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import { useSession } from "@/lib/session";

const STATUTS_A_SUIVRE = ["envoyee", "recue", "examens"];

export default function SuiviDesSoins() {
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
    return dossiers.filter((d) => STATUTS_A_SUIVRE.includes(d.orientation.statut));
  });

  if (!pret) return <Squelette lignes={4} />;
  const aSuivre = donnees ?? [];

  return (
    <>
      <TitreSection aide="Marquez la patiente reçue ou absente, enregistrez les examens, saisissez le résultat et laissez une note pour l'agent.">
        Suivi des soins
      </TitreSection>

      {aSuivre.length === 0 ? (
        <EtatVide
          titre="Aucun suivi en attente"
          texte="Les dossiers en cours de prise en charge apparaissent ici."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {aSuivre.map((d) => (
            <li key={d.orientation.id}>
              <Carte>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-prune-900">{d.patiente.nom}</span>
                      {d.consultation.niveau_valide ? (
                        <BadgeNiveau niveau={d.consultation.niveau_valide} taille="petit" />
                      ) : null}
                    </div>
                    <p className="text-sm text-sable-600">
                      {d.patiente.age} ans · {d.district?.nom ?? "—"} ·{" "}
                      {LIBELLE_STATUT_ORIENTATION[d.orientation.statut]}
                      {d.creneau ? ` · ${dateCourte(d.creneau.debut)}` : ""}
                    </p>
                  </div>
                  {/*
                    Cible tactile de 44 px (WCAG 2.5.5) : un lien de la hauteur
                    de son texte ne fait que 20 px, ce que l'audit des écrans
                    signale. Le mot reste le même, la zone d'appui grandit.
                  */}
                  <Link
                    href={`/centre/patientes/${d.orientation.id}`}
                    className="inline-flex min-h-[var(--spacing-cible)] items-center text-sm text-rose-700 hover:underline"
                  >
                    Voir le dossier
                  </Link>
                </div>

                <SuiviForm orientationId={d.orientation.id} auteurId={profil?.id ?? ""} />
              </Carte>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
