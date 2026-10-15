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
import { construireDossier } from "@/lib/data";
import { formaterFcfa } from "@/lib/financement";
import { useDonnees } from "@/lib/hooks";
import {
  LIBELLE_DOULEUR,
  LIBELLE_ECOULEMENT,
  LIBELLE_ETAPE,
  LIBELLE_PEAU,
  LIBELLE_RESULTAT,
  LIBELLE_SEIN,
  LIBELLE_STATUT_ORIENTATION,
  dateLisible,
  depuis,
} from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import type { Fiche } from "@/lib/types";

export default function PageDossier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Dossier id={id} />
    </Espace>
  );
}

function Dossier({ id }: { id: string }) {
  const { donnees, pret } = useDonnees(() => construireDossier(id));

  if (!pret) return <Chargement texte="Ouverture du dossier" />;
  if (!donnees) {
    return (
      <MessageErreur
        titre="Dossier introuvable"
        texte="Ce dossier n'existe plus ou n'appartient pas à votre centre."
      />
    );
  }

  const { orientation, consultation, patiente, district, agent, financement, creneau, suivis } =
    donnees;

  return (
    <>
      <Retour href="/centre/patientes" libelle="Patientes" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{patiente.nom}</h1>
          <p className="mt-1 text-sable-600">
            {patiente.age} ans · {district?.nom ?? "—"}
            {patiente.village ? ` · ${patiente.village}` : ""}
          </p>
        </div>
        {consultation.niveau_valide ? (
          <BadgeNiveau niveau={consultation.niveau_valide} taille="grand" />
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          {orientation.resume_ia ? (
            <Carte>
              <h2 className="mb-2 text-lg">Résumé pour le spécialiste</h2>
              <p className="text-[0.95rem] leading-relaxed text-prune-800">
                {orientation.resume_ia}
              </p>
            </Carte>
          ) : null}

          <Carte>
            <h2 className="mb-3 text-lg">Ce qui a été relevé</h2>
            <dl>{consultation.fiche ? <LignesFiche fiche={consultation.fiche} /> : null}</dl>
          </Carte>

          <Carte>
            <h2 className="mb-2 text-lg">Récit de la patiente</h2>
            <p className="text-[0.95rem] leading-relaxed text-prune-800">
              {consultation.recit}
            </p>
          </Carte>

          <Carte>
            <h2 className="mb-3 text-lg">Classement</h2>
            <dl>
              <Ligne libelle="Niveau proposé">
                {consultation.niveau_propose ? mot(consultation.niveau_propose) : "—"}
              </Ligne>
              <Ligne libelle="Niveau retenu par l'agent">
                {consultation.niveau_valide ? mot(consultation.niveau_valide) : "—"}
              </Ligne>
              {consultation.raison_correction ? (
                <Ligne libelle="Raison de la correction">
                  {consultation.raison_correction}
                </Ligne>
              ) : null}
              <Ligne libelle="Agent d'origine">
                {agent ? `${agent.nom} — ${agent.centre_sante ?? ""}` : "—"}
              </Ligne>
            </dl>
            {consultation.commentaire_correction ? (
              <p className="mt-3 text-sm text-sable-600">
                {consultation.commentaire_correction}
              </p>
            ) : null}
          </Carte>

          <MentionPasDeDiagnostic />
        </div>

        <div className="flex flex-col gap-4">
          <Carte>
            <h2 className="mb-3 text-lg">Rendez-vous</h2>
            <dl>
              {creneau ? <Ligne libelle="Date">{dateLisible(creneau.debut)}</Ligne> : null}
              <Ligne libelle="État">{LIBELLE_STATUT_ORIENTATION[orientation.statut]}</Ligne>
              <Ligne libelle="Financement">
                {financement?.statut === "confirmee"
                  ? formaterFcfa(financement.montant)
                  : "En attente"}
              </Ligne>
              <Ligne libelle="Téléphone">{patiente.telephone || "Non donné"}</Ligne>
            </dl>
          </Carte>

          <Carte>
            <h2 className="mb-3 text-lg">Historique du suivi</h2>
            {suivis.length === 0 ? (
              <MessageInfo>Aucune étape enregistrée pour le moment.</MessageInfo>
            ) : (
              <ol className="flex flex-col gap-3">
                {suivis.map((s) => (
                  <li key={s.id} className="border-l-2 border-sable-300 pl-3">
                    <p className="font-medium text-prune-900">{LIBELLE_ETAPE[s.etape]}</p>
                    {s.resultat !== "en_attente" ? (
                      <p className="text-[0.95rem] text-prune-800">
                        {LIBELLE_RESULTAT[s.resultat]}
                      </p>
                    ) : null}
                    {s.note ? <p className="text-sm text-sable-600">{s.note}</p> : null}
                    <p className="text-sm text-sable-500">{depuis(s.cree_le)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Carte>

          <BoutonLien href="/centre/suivi" variante="second">
            Suivi des soins →
          </BoutonLien>
        </div>
      </div>
    </>
  );
}

function mot(n: "vert" | "orange" | "rouge"): string {
  return { vert: "Vert", orange: "Orange", rouge: "Rouge" }[n];
}

function LignesFiche({ fiche }: { fiche: Fiche }) {
  const ouiNon = (v: boolean | null) => (v === null ? "Non précisé" : v ? "Oui" : "Non");
  return (
    <>
      <Ligne libelle="Sein concerné">
        {fiche.sein ? LIBELLE_SEIN[fiche.sein] : "Non précisé"}
      </Ligne>
      <Ligne libelle="Boule">{ouiNon(fiche.masse)}</Ligne>
      {fiche.masse ? (
        <>
          <Ligne libelle="Boule dure">{ouiNon(fiche.masse_dure)}</Ligne>
          <Ligne libelle="Boule fixée">{ouiNon(fiche.masse_fixe)}</Ligne>
        </>
      ) : null}
      <Ligne libelle="Depuis">
        {fiche.duree_semaines === null ? "Non précisé" : `${fiche.duree_semaines} semaines`}
      </Ligne>
      <Ligne libelle="Douleur">
        {fiche.douleur ? LIBELLE_DOULEUR[fiche.douleur] : "Non précisé"}
      </Ligne>
      <Ligne libelle="Peau">
        {fiche.peau.length === 0
          ? "Rien de signalé"
          : fiche.peau.map((p) => LIBELLE_PEAU[p]).join(", ")}
      </Ligne>
      <Ligne libelle="Mamelon rentré depuis peu">
        {ouiNon(fiche.mamelon_retraction_recente)}
      </Ligne>
      <Ligne libelle="Écoulement">
        {fiche.ecoulement ? LIBELLE_ECOULEMENT[fiche.ecoulement] : "Non précisé"}
      </Ligne>
      {fiche.ecoulement && fiche.ecoulement !== "aucun" ? (
        <Ligne libelle="D'un seul côté">{ouiNon(fiche.ecoulement_un_cote)}</Ligne>
      ) : null}
      <Ligne libelle="Ganglion sous l'aisselle">{ouiNon(fiche.ganglion_aisselle)}</Ligne>
      <Ligne libelle="Antécédents familiaux">{ouiNon(fiche.antecedents_familiaux)}</Ligne>
      {fiche.autres ? <Ligne libelle="Autre">{fiche.autres}</Ligne> : null}
    </>
  );
}
