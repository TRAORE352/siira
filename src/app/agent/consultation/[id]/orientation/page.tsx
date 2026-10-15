"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Bouton } from "@/components/Bouton";
import { BarreAction, Espace, Redirection, Retour } from "@/components/Espace";
import {
  Carte,
  Chargement,
  Ligne,
  MentionPasDeDiagnostic,
  MessageErreur,
  MessageInfo,
  TitreSection,
} from "@/components/Interface";
import {
  detailPatiente,
  envoyerOrientation,
  listerOngs,
  messagePourLaPatiente,
  preparerOrientation,
  trouverConsultation,
  trouverOrientationParConsultation,
} from "@/lib/data";
import type { PropositionOrientation } from "@/lib/data";
import { formaterFcfa } from "@/lib/financement";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_PAIEMENT, dateLisible } from "@/lib/libelles";
import type { PropositionCentre } from "@/lib/matching";

export default function PageOrientation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Espace role="agent">
      <Orientation id={id} />
    </Espace>
  );
}

function Orientation({ id }: { id: string }) {
  const router = useRouter();
  const [choisi, setChoisi] = useState<PropositionCentre | null>(null);
  const [voirTous, setVoirTous] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const { donnees, pret } = useDonnees(() => {
    const consultation = trouverConsultation(id);
    if (!consultation) return null;
    const detail = detailPatiente(consultation.patiente_id);
    const dejaEnvoyee = trouverOrientationParConsultation(id);
    let proposition: PropositionOrientation | null = null;
    if (!dejaEnvoyee) {
      try {
        proposition = preparerOrientation(id);
      } catch {
        proposition = null;
      }
    }
    return { consultation, detail, proposition, dejaEnvoyee, ongs: listerOngs() };
  });

  if (!pret) return <Chargement texte="Recherche du centre le plus adapté" />;
  if (!donnees || !donnees.detail) {
    return (
      <MessageErreur
        titre="Cas introuvable"
        texte="Cette consultation n'existe plus. Revenez à la liste de vos patientes."
      />
    );
  }

  const { consultation, detail, proposition, dejaEnvoyee } = donnees;
  const patiente = detail.patiente;
  const niveau = consultation.niveau_valide;

  /*
   * Dossier déjà parti : l'écran de confirmation est la seule page qui dit ce
   * qu'il est devenu. On y renvoie plutôt que d'en réécrire un résumé ici,
   * qui finirait par diverger de l'autre.
   */
  if (dejaEnvoyee) {
    return <Redirection vers={`/agent/consultation/${id}/confirmation`} />;
  }

  if (!niveau || niveau === "vert" || !proposition) {
    return (
      <MessageErreur
        titre="Aucune orientation à faire"
        texte="Ce cas ne demande pas d'orientation vers un centre spécialisé."
      />
    );
  }

  const retenu = choisi ?? proposition.proposition;
  const montant = proposition.montant;
  const ongs = proposition.ongs_pressenties;

  function envoyer() {
    if (!retenu) return;
    setErreur(null);
    setEnvoi(true);
    try {
      envoyerOrientation({
        consultation_id: id,
        centre_id: retenu.centre.id,
        creneau_id: retenu.creneau.id,
        score: retenu.score,
      });
      router.push(`/agent/consultation/${id}/confirmation`);
    } catch (e) {
      setEnvoi(false);
      setErreur(
        e instanceof Error
          ? e.message
          : "L'envoi n'a pas abouti. Vérifiez le rendez-vous et recommencez.",
      );
    }
  }

  return (
    <>
      <Retour href={`/agent/consultation/${id}/resultat`} libelle="Revenir au résultat" />

      <div className="mb-3 flex items-center gap-3">
        <p className="text-sm text-sable-600">
          {patiente.nom} · {patiente.age} ans
        </p>
        <BadgeNiveau niveau={niveau} taille="petit" />
      </div>

      <TitreSection aide="Vérifiez le centre et le rendez-vous, puis envoyez le dossier.">
        Orientation
      </TitreSection>

      {erreur ? <MessageErreur texte={erreur} className="mb-4" /> : null}

      {proposition.aucun_dans_le_delai ? (
        <div className="mb-4">
          <MessageErreur
            titre="Aucun centre disponible dans le délai"
            texte="Le centre proposé ci-dessous est le plus proche, mais le rendez-vous dépasse le délai recommandé."
          />
        </div>
      ) : null}

      {!retenu ? (
        <MessageErreur
          titre="Aucun centre ne peut recevoir la patiente"
          texte="Aucun centre ne propose les examens nécessaires pour le moment. Signalez-le à votre superviseur."
        />
      ) : (
        <>
          <Carte>
            <h3 className="text-lg">{retenu.centre.nom}</h3>
            <p className="text-sm text-sable-600">{retenu.centre.service}</p>
            {retenu.hors_delai ? (
              <p className="mt-2 inline-block rounded-full border border-orange-bord bg-orange-bg px-2.5 py-0.5 text-sm font-medium text-orange-texte">
                Hors délai recommandé
              </p>
            ) : null}
            <dl className="mt-3">
              <Ligne libelle="Rendez-vous">{dateLisible(retenu.creneau.debut)}</Ligne>
              <Ligne libelle="Distance">{retenu.distance_km} km</Ligne>
              <Ligne libelle="Attente">
                {retenu.jours_attente === 0
                  ? "Aujourd'hui"
                  : `${retenu.jours_attente} jours`}
              </Ligne>
              <Ligne libelle="Examens prévus">
                {niveau === "rouge" ? "Échographie et biopsie" : "Échographie"}
              </Ligne>
            </dl>
          </Carte>

          {proposition.alternatives.length > 1 ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setVoirTous((v) => !v)}
                aria-expanded={voirTous}
                className="flex min-h-[var(--spacing-cible)] items-center text-[0.95rem] font-medium text-rose-700 underline-offset-4 hover:underline"
              >
                {voirTous ? "Masquer les autres centres" : "Voir les autres centres"}
              </button>

              {voirTous ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {proposition.alternatives.map((p) => {
                    const actif = p.centre.id === retenu.centre.id;
                    return (
                      <li key={p.centre.id}>
                        <button
                          type="button"
                          onClick={() => setChoisi(p)}
                          className={`w-full rounded-[var(--radius-moyen)] border p-3 text-left transition-colors ${
                            actif
                              ? "border-rose-600 bg-rose-50"
                              : "border-sable-300 bg-white hover:bg-sable-100"
                          }`}
                        >
                          <span className="block font-medium text-prune-900">
                            {p.centre.nom}
                          </span>
                          <span className="block text-sm text-sable-600">
                            {p.distance_km} km · {dateLisible(p.creneau.debut)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}

          <Carte className="mt-4">
            <h3 className="mb-3 text-lg">Financement des soins</h3>
            <p className="mb-3 text-sm text-sable-600">
              {LIBELLE_PAIEMENT[patiente.capacite_paiement]}.
            </p>

            {!montant ? (
              <MessageInfo>
                La patiente peut payer ses soins. Aucune demande n&apos;est envoyée aux
                ONG.
              </MessageInfo>
            ) : (
              <>
                <dl>
                  {montant.lignes.map((l) => (
                    <Ligne key={l.soin} libelle={libelleSoin(l.soin)}>
                      {formaterFcfa(l.montant)}
                    </Ligne>
                  ))}
                  <Ligne libelle="Montant demandé">
                    {formaterFcfa(montant.montant)}
                  </Ligne>
                </dl>
                <p className="mt-3 text-[0.95rem] text-prune-800">
                  {ongs.length === 0
                    ? "Aucune ONG ne couvre ce cas pour le moment. Le dossier part quand même, le financement reste en attente."
                    : `La demande sera envoyée à ${ongs.length} ONG : ${ongs
                        .map((o) => o.nom)
                        .join(", ")}.`}
                </p>
              </>
            )}
          </Carte>

          <Carte className="mt-4">
            <h3 className="mb-2 text-lg">Message pour la patiente</h3>
            <p className="mb-3 text-sm text-sable-600">
              Lisez ce message à la patiente avant qu&apos;elle parte.
            </p>
            <p className="rounded-[var(--radius-moyen)] border border-sable-300 bg-sable-100 p-3 text-[0.95rem] text-prune-900">
              {messagePourLaPatiente({
                prenom: patiente.nom.split(/\s+/)[0],
                centre: retenu.centre.nom,
                debut: retenu.creneau.debut,
              })}
            </p>
          </Carte>

          <MentionPasDeDiagnostic className="mt-4" />

          <BarreAction>
            <Bouton
              taille="grand"
              onClick={envoyer}
              chargement={envoi}
              className="w-full sm:w-auto"
            >
              Envoyer le dossier
            </Bouton>
          </BarreAction>
        </>
      )}
    </>
  );
}

const SOINS: Record<string, string> = {
  consultation: "Consultation spécialisée",
  echographie: "Échographie mammaire",
  biopsie: "Biopsie",
  transport: "Transport",
};

function libelleSoin(soin: string): string {
  return SOINS[soin] ?? soin;
}
