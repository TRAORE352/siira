"use client";

import { use } from "react";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { BoutonLien } from "@/components/Bouton";
import { Espace, Retour } from "@/components/Espace";
import {
  Carte,
  Chargement,
  Ligne,
  MentionPasDeDiagnostic,
  MessageErreur,
  MessageInfo,
} from "@/components/Interface";
import {
  detailPatiente,
  listerSuivis,
  messagePourLaPatiente,
  trouverCreneau,
  trouverOng,
} from "@/lib/data";
import { formaterFcfa } from "@/lib/financement";
import { useDonnees } from "@/lib/hooks";
import {
  CONSEILS_VERT,
  LIBELLE_ETAPE,
  LIBELLE_PAIEMENT,
  LIBELLE_RESULTAT,
  LIBELLE_STATUT_ORIENTATION,
  dateLisible,
  depuis,
} from "@/lib/libelles";

export default function PagePatiente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Espace role="agent">
      <FichePatiente id={id} />
    </Espace>
  );
}

function FichePatiente({ id }: { id: string }) {
  const { donnees, pret } = useDonnees(() => {
    const detail = detailPatiente(id);
    if (!detail) return null;
    const suivis = detail.orientation ? listerSuivis(detail.orientation.id) : [];
    const creneau = detail.orientation
      ? trouverCreneau(detail.orientation.creneau_id)
      : null;
    const ong = detail.financement ? trouverOng(detail.financement.ong_id) : undefined;
    return { detail, suivis, creneau, ong };
  });

  if (!pret) return <Chargement texte="Ouverture de la fiche" />;
  if (!donnees) {
    return (
      <MessageErreur
        titre="Patiente introuvable"
        texte="Cette fiche n'existe plus. Revenez à la liste de vos patientes."
      />
    );
  }

  const { detail, suivis, creneau, ong } = donnees;
  const { patiente, consultation, orientation, financement } = detail;
  const niveau = consultation?.niveau_valide ?? consultation?.niveau_propose ?? null;

  return (
    <>
      <Retour href="/agent/patientes" libelle="Mes patientes" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{patiente.nom}</h1>
          <p className="mt-1 text-sable-600">
            {patiente.age} ans · {detail.district?.nom ?? "District non précisé"}
            {patiente.village ? ` · ${patiente.village}` : ""}
          </p>
        </div>
        {niveau ? <BadgeNiveau niveau={niveau} taille="grand" /> : null}
      </div>

      {detail.absente ? (
        <div className="mt-4">
          <MessageErreur
            titre="La patiente n'est pas venue"
            texte="Le centre signale qu'elle ne s'est pas présentée au rendez-vous. Allez la voir pour comprendre ce qui bloque."
          />
        </div>
      ) : null}

      <Carte className="mt-4">
        <h2 className="mb-3 text-lg">Informations</h2>
        <dl>
          <Ligne libelle="Code du cas">{patiente.code}</Ligne>
          <Ligne libelle="Téléphone">{patiente.telephone || "Non donné"}</Ligne>
          <Ligne libelle="Paiement">
            {LIBELLE_PAIEMENT[patiente.capacite_paiement]}
          </Ligne>
          <Ligne libelle="Enregistrée">{depuis(patiente.cree_le)}</Ligne>
        </dl>
      </Carte>

      {consultation ? (
        <Carte className="mt-4">
          <h2 className="mb-3 text-lg">Ce qu&apos;elle a décrit</h2>
          <p className="text-[0.95rem] leading-relaxed text-prune-800">
            {consultation.recit}
          </p>
          {consultation.explication ? (
            <div className="mt-4">
              <MessageInfo titre="Pourquoi ce niveau">
                <p className="mt-1">{consultation.explication}</p>
              </MessageInfo>
            </div>
          ) : null}
          {consultation.raison_correction ? (
            <p className="mt-3 text-sm text-sable-600">
              Niveau corrigé par vous. Raison : {consultation.raison_correction}
              {consultation.commentaire_correction
                ? ` — ${consultation.commentaire_correction}`
                : ""}
            </p>
          ) : null}
        </Carte>
      ) : null}

      {niveau === "vert" && !orientation ? (
        <Carte className="mt-4">
          <h2 className="mb-3 text-lg">Surveillance</h2>
          <ul className="flex flex-col gap-2">
            {CONSEILS_VERT.map((c) => (
              <li key={c} className="flex gap-2 text-[0.95rem] text-prune-800">
                <span aria-hidden="true">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Carte>
      ) : null}

      {orientation ? (
        <>
          <Carte className="mt-4">
            <h2 className="mb-3 text-lg">Orientation</h2>
            <dl>
              <Ligne libelle="Centre">{detail.centre?.nom ?? "—"}</Ligne>
              {creneau ? (
                <Ligne libelle="Rendez-vous">{dateLisible(creneau.debut)}</Ligne>
              ) : null}
              <Ligne libelle="État">
                {LIBELLE_STATUT_ORIENTATION[orientation.statut]}
              </Ligne>
            </dl>

            {creneau && detail.centre ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-prune-800">
                  Message pour la patiente
                </p>
                <p className="rounded-[var(--radius-moyen)] border border-sable-300 bg-sable-100 p-3 text-[0.95rem] text-prune-900">
                  {messagePourLaPatiente({
                    prenom: patiente.nom.split(/\s+/)[0],
                    centre: detail.centre.nom,
                    debut: creneau.debut,
                  })}
                </p>
              </div>
            ) : null}
          </Carte>

          <Carte className="mt-4">
            <h2 className="mb-3 text-lg">Financement</h2>
            {!financement ? (
              <p className="text-[0.95rem] text-prune-800">
                Aucune demande de financement pour ce cas.
              </p>
            ) : financement.statut === "confirmee" ? (
              <p className="rounded-[var(--radius-moyen)] border border-vert-bord bg-vert-bg p-3 text-[0.95rem] text-vert-texte">
                Soins financés par {ong?.nom ?? "une ONG"} :{" "}
                {formaterFcfa(financement.montant)}.
              </p>
            ) : financement.statut === "proposee" ? (
              <p className="text-[0.95rem] text-prune-800">
                Prise en charge demandée. La réponse du partenaire est traitée
                en dehors de Siira.
              </p>
            ) : (
              <p className="text-[0.95rem] text-prune-800">Financement en attente.</p>
            )}
          </Carte>

          {suivis.length > 0 ? (
            <Carte className="mt-4">
              <h2 className="mb-3 text-lg">Suite donnée par le centre</h2>
              <ol className="flex flex-col gap-3">
                {suivis.map((s) => (
                  <li key={s.id} className="border-l-2 border-sable-300 pl-3">
                    <p className="font-medium text-prune-900">
                      {LIBELLE_ETAPE[s.etape]}
                    </p>
                    {s.resultat !== "en_attente" ? (
                      <p className="text-[0.95rem] text-prune-800">
                        {LIBELLE_RESULTAT[s.resultat]}
                      </p>
                    ) : null}
                    {s.note ? (
                      <p className="text-sm text-sable-600">{s.note}</p>
                    ) : null}
                    <p className="text-sm text-sable-600">{depuis(s.cree_le)}</p>
                  </li>
                ))}
              </ol>
            </Carte>
          ) : null}
        </>
      ) : null}

      {consultation && !orientation && niveau !== "vert" ? (
        <div className="mt-4">
          <BoutonLien href={`/agent/consultation/${consultation.id}/orientation`}>
            Continuer vers l&apos;orientation
          </BoutonLien>
        </div>
      ) : null}

      <MentionPasDeDiagnostic className="mt-6" />
    </>
  );
}
