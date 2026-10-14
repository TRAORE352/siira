"use client";

import Link from "next/link";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { BoutonLien } from "@/components/Bouton";
import { Espace } from "@/components/Espace";
import { Carte, EtatVide, Squelette, TitreSection } from "@/components/Interface";
import { listerPatientesAgent } from "@/lib/data";
import type { PatienteEnListe } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_ORIENTATION, depuis } from "@/lib/libelles";
import { useSession } from "@/lib/session";

export default function AccueilAgent() {
  return (
    <Espace role="agent">
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const agentId = profil?.id ?? "";
  const { donnees, pret } = useDonnees<PatienteEnListe[]>(() =>
    agentId ? listerPatientesAgent(agentId) : [],
  );

  return (
    <>
      <TitreSection aide="Les patientes que vous suivez, la plus récente en premier.">
        Mes patientes
      </TitreSection>

      <BoutonLien href="/agent/consultation/nouvelle" taille="grand" className="w-full">
        Nouvelle consultation
      </BoutonLien>

      <div className="mt-6">
        {!pret ? (
          <Squelette lignes={3} />
        ) : !donnees || donnees.length === 0 ? (
          <EtatVide
            titre="Aucune patiente pour le moment"
            texte="Dès que vous enregistrez une première consultation, elle apparaît ici."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {donnees.map((d) => (
              <li key={d.patiente.id}>
                <LignePatiente detail={d} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function LignePatiente({ detail }: { detail: PatienteEnListe }) {
  const { patiente, consultation, orientation, absente } = detail;
  const niveau = consultation?.niveau_valide ?? consultation?.niveau_propose ?? null;

  return (
    <Carte className="p-0">
      <Link
        href={`/agent/patiente/${patiente.id}`}
        className="block rounded-[var(--radius-grand)] p-4 transition-colors hover:bg-sable-100"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-prune-900">{patiente.nom}</p>
            <p className="text-sm text-sable-600">
              {patiente.age} ans · {detail.district?.nom ?? "District non précisé"}
            </p>
          </div>
          {niveau ? <BadgeNiveau niveau={niveau} /> : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-sable-600">
            {orientation
              ? LIBELLE_STATUT_ORIENTATION[orientation.statut]
              : consultation?.statut === "close"
                ? "Surveillance à domicile"
                : "Consultation en cours"}
          </span>
          <span aria-hidden="true" className="text-sable-400">
            ·
          </span>
          <span className="text-sable-600">{depuis(patiente.cree_le)}</span>
        </div>

        {absente ? (
          <p className="mt-3 rounded-[var(--radius-petit)] border border-rouge-bord bg-rouge-bg px-3 py-2 text-sm font-medium text-rouge-texte">
            Elle n&apos;est pas venue au rendez-vous. Allez la voir.
          </p>
        ) : null}
      </Link>
    </Carte>
  );
}
