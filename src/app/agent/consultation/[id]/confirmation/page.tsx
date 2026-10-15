"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { Bouton } from "@/components/Bouton";
import { Espace } from "@/components/Espace";
import { Carte, Chargement, Ligne, MessageErreur } from "@/components/Interface";
import {
  detailPatiente,
  listerOngs,
  messagePourLaPatiente,
  trouverCentre,
  trouverConsultation,
  trouverCreneau,
  trouverOrientationParConsultation,
} from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { dateLisible } from "@/lib/libelles";

/**
 * Confirmation d'envoi du dossier.
 *
 * Un dossier envoyé est le moment le plus important du travail de l'agent :
 * une femme vient d'obtenir un rendez-vous. Jusqu'ici l'application renvoyait
 * sans rien dire vers la fiche de la patiente — l'agent ne savait pas si son
 * geste avait abouti.
 *
 * Cet écran répond à trois questions, dans cet ordre : est-ce parti ? quand
 * est le rendez-vous ? qu'est-ce que je dis à la patiente maintenant ?
 */
export default function PageConfirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Espace role="agent" entete="aucun">
      <Confirmation id={id} />
    </Espace>
  );
}

function Confirmation({ id }: { id: string }) {
  const router = useRouter();

  const { donnees, pret } = useDonnees(() => {
    const consultation = trouverConsultation(id);
    if (!consultation) return null;
    const detail = detailPatiente(consultation.patiente_id);
    const orientation = trouverOrientationParConsultation(id);
    if (!detail || !orientation) return null;
    return {
      patiente: detail.patiente,
      orientation,
      centre: trouverCentre(orientation.centre_id),
      creneau: trouverCreneau(orientation.creneau_id),
      ongs: listerOngs(),
    };
  });

  if (!pret) return <Chargement texte="Envoi du dossier" />;

  if (!donnees) {
    return (
      <main id="contenu" className="mx-auto w-full max-w-md flex-1 px-5 py-8">
        <MessageErreur
          titre="Dossier introuvable"
          texte="Ce dossier n'a pas été envoyé, ou il n'existe plus. Revenez à la liste de vos patientes."
          action={
            <Bouton variante="second" onClick={() => router.push("/agent")}>
              Mes patientes
            </Bouton>
          }
        />
      </main>
    );
  }

  const { patiente, centre, creneau } = donnees;
  const prenom = patiente.nom.split(/\s+/)[0];

  return (
    <main id="contenu" className="flex min-h-screen flex-col bg-sable-50">
      {/*
        Bandeau de marque : il marque la réussite par la couleur avant même
        qu'on lise. C'est le seul écran de l'agent qui s'ouvre ainsi — on ne
        banalise pas ce moment.
      */}
      <div className="fond-marque px-6 pt-14 pb-20 text-center">
        <span
          aria-hidden="true"
          className="sceau-confirmation mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 shadow-[0_14px_34px_rgba(214,51,108,0.45)]"
        >
          {/* Coche tracée au trait, comme le chemin de la marque. */}
          <svg viewBox="0 0 32 32" className="h-9 w-9" fill="none">
            <path
              d="M8 16.5 L13.5 22 L24 10.5"
              stroke="white"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sceau-coche"
            />
          </svg>
        </span>

        {/*
          `role="status"` : un lecteur d'écran annonce l'aboutissement sans
          que l'agent ait à chercher l'information.
        */}
        <h1
          role="status"
          className="confirmation-titre mt-6 font-[family-name:var(--font-titre)] text-[2.1rem] leading-tight text-white"
        >
          Le dossier est parti
        </h1>

        <p className="confirmation-phrase mt-3 text-[1.05rem] leading-relaxed text-rose-100/80">
          {centre
            ? `${centre.nom} a reçu le dossier de ${prenom}.`
            : `Le centre a reçu le dossier de ${prenom}.`}
        </p>
      </div>

      {/*
        La feuille blanche remonte sur le bandeau : le contenu utile commence
        ici, et l'ombre pose la séparation sans trait dur.
      */}
      <div className="confirmation-feuille -mt-10 flex-1 rounded-t-[var(--radius-feuille)] bg-sable-50 px-5 pt-7 pb-10 shadow-[var(--shadow-feuille)]">
        <div className="mx-auto w-full max-w-md">
          {creneau && centre ? (
            <Carte>
              <h2 className="mb-3 text-lg">Le rendez-vous</h2>
              <dl>
                <Ligne libelle="Centre">{centre.nom}</Ligne>
                <Ligne libelle="Date">{dateLisible(creneau.debut)}</Ligne>
                <Ligne libelle="Patiente">
                  {patiente.nom} · {patiente.age} ans
                </Ligne>
              </dl>
            </Carte>
          ) : null}

          {/* Ce que l'agent doit dire, maintenant, avant que la patiente parte. */}
          <Carte className="mt-4 border-rose-200 bg-rose-50">
            <h2 className="mb-2 text-lg">À dire à {prenom} maintenant</h2>
            <p className="rounded-[var(--radius-moyen)] border border-rose-200 bg-white p-3 text-[0.95rem] leading-relaxed text-prune-900">
              {centre && creneau
                ? messagePourLaPatiente({
                    prenom,
                    centre: centre.nom,
                    debut: creneau.debut,
                  })
                : "Le centre vous recontactera pour confirmer le rendez-vous."}
            </p>
          </Carte>

          <div className="mt-6 flex flex-col gap-2.5">
            <Bouton
              taille="grand"
              className="w-full"
              onClick={() => router.push(`/agent/patiente/${patiente.id}`)}
            >
              Voir la fiche de {prenom}
            </Bouton>
            <Bouton
              variante="second"
              taille="grand"
              className="w-full"
              onClick={() => router.push("/agent")}
            >
              Retour à mes patientes
            </Bouton>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-sable-600">
            Vous serez prévenue ici dès que le centre aura reçu {prenom}.
          </p>
        </div>
      </div>
    </main>
  );
}
