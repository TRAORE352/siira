"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { BandeauNiveau } from "@/components/BadgeNiveau";
import { Bouton } from "@/components/Bouton";
import { Liste, ZoneTexte } from "@/components/Champs";
import { BarreAction, Espace, Retour } from "@/components/Espace";
import { FicheModifiable } from "@/components/FicheModifiable";
import {
  Carte,
  Chargement,
  MentionPasDeDiagnostic,
  MessageErreur,
  MessageInfo,
} from "@/components/Interface";
import {
  detailPatiente,
  mettreAJourFiche,
  trouverConsultation,
  validerNiveau,
} from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { CONSEILS_VERT, DELAI_NIVEAU, RAISONS_CORRECTION } from "@/lib/libelles";
import { classer } from "@/lib/regles";
import type { Fiche, Niveau } from "@/lib/types";

const MOT: Record<Niveau, string> = { vert: "Vert", orange: "Orange", rouge: "Rouge" };

export default function PageResultat({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Espace role="agent">
      <Resultat id={id} />
    </Espace>
  );
}

function Resultat({ id }: { id: string }) {
  const router = useRouter();
  const { donnees, pret } = useDonnees(() => {
    const consultation = trouverConsultation(id);
    const detail = consultation ? detailPatiente(consultation.patiente_id) : null;
    return { consultation, detail };
  });

  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [correction, setCorrection] = useState(false);
  const [niveauChoisi, setNiveauChoisi] = useState<Niveau | "">("");
  const [raison, setRaison] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const consultation = donnees?.consultation ?? null;
  const patiente = donnees?.detail?.patiente ?? null;

  if (!pret) return <Chargement texte="Analyse du cas" />;
  if (!consultation || !patiente) {
    return (
      <MessageErreur
        titre="Cas introuvable"
        texte="Cette consultation n'existe plus. Revenez à la liste de vos patientes."
      />
    );
  }

  const ficheCourante = fiche ?? consultation.fiche;
  if (!ficheCourante) return <Chargement />;

  // Classement recalculé à chaque modification, sans attendre l'enregistrement.
  const resultat = classer({ fiche: ficheCourante, age: patiente.age });
  const niveau = resultat.niveau;

  function changerFiche(f: Fiche) {
    setFiche(f);
    mettreAJourFiche(id, f);
  }

  function valider() {
    setErreur(null);
    const choisi = correction ? niveauChoisi : niveau;
    if (correction && !choisi) {
      setErreur("Choisissez le niveau que vous retenez.");
      return;
    }
    if (correction && !raison) {
      setErreur("Choisissez la raison de votre correction.");
      return;
    }
    setEnvoi(true);
    try {
      validerNiveau(id, {
        niveau: choisi as Niveau,
        raison_correction: correction ? raison : null,
        commentaire_correction: correction ? commentaire.trim() || null : null,
      });
      if (choisi === "vert") router.push(`/agent/patiente/${patiente!.id}`);
      else router.push(`/agent/consultation/${id}/orientation`);
    } catch {
      setEnvoi(false);
      setErreur("La validation n'a pas abouti. Recommencez.");
    }
  }

  return (
    <>
      <Retour href="/agent" libelle="Mes patientes" />

      <p className="mb-3 text-sm text-sable-600">
        {patiente.nom} · {patiente.age} ans
      </p>

      <BandeauNiveau niveau={niveau} delai={DELAI_NIVEAU[niveau]}>
        <ul className="mt-4 flex flex-col gap-1.5">
          {resultat.regles.map((r) => (
            <li key={r.code} className="flex gap-2 text-[0.95rem]">
              <span aria-hidden="true">•</span>
              <span>{r.libelle}</span>
            </li>
          ))}
        </ul>
      </BandeauNiveau>

      {consultation.explication ? (
        <div className="mt-4">
          <MessageInfo titre="Pourquoi ce niveau">
            <p className="mt-1">{consultation.explication}</p>
          </MessageInfo>
        </div>
      ) : null}

      <MentionPasDeDiagnostic className="mt-4" />

      {resultat.champ_a_completer ? (
        <div className="mt-4">
          <MessageErreur
            titre="Une information manque"
            texte="Dites si la patiente a une boule dans le sein. Tant que ce n'est pas précisé, le niveau ne peut pas être vert."
          />
        </div>
      ) : null}

      {niveau === "vert" ? (
        <Carte className="mt-4">
          <h3 className="mb-3 text-lg">Ce qu&apos;il faut dire à la patiente</h3>
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

      <div className="mt-4">
        <FicheModifiable
          fiche={ficheCourante}
          surChangement={changerFiche}
          champASignaler={resultat.champ_a_completer}
        />
      </div>

      <Carte className="mt-4">
        <h3 className="mb-3 text-lg">Votre décision</h3>
        {erreur ? <MessageErreur texte={erreur} className="mb-4" /> : null}

        <div className="flex flex-col gap-2">
          <label
            className={`flex min-h-[var(--spacing-cible)] cursor-pointer items-center gap-3 rounded-[var(--radius-moyen)] border p-3 ${
              !correction
                ? "border-rose-600 bg-rose-50"
                : "border-sable-300 bg-white hover:bg-sable-100"
            }`}
          >
            <input
              type="radio"
              name="decision"
              checked={!correction}
              onChange={() => setCorrection(false)}
              className="h-5 w-5 accent-rose-600"
            />
            <span className="text-[0.95rem] text-prune-900">
              Je valide le niveau {MOT[niveau].toLowerCase()}
            </span>
          </label>

          <label
            className={`flex min-h-[var(--spacing-cible)] cursor-pointer items-center gap-3 rounded-[var(--radius-moyen)] border p-3 ${
              correction
                ? "border-rose-600 bg-rose-50"
                : "border-sable-300 bg-white hover:bg-sable-100"
            }`}
          >
            <input
              type="radio"
              name="decision"
              checked={correction}
              onChange={() => setCorrection(true)}
              className="h-5 w-5 accent-rose-600"
            />
            <span className="text-[0.95rem] text-prune-900">
              Je corrige le niveau
            </span>
          </label>
        </div>

        {correction ? (
          <div className="mt-4 flex flex-col gap-4">
            <Liste
              label="Niveau que vous retenez"
              obligatoire
              placeholder="Choisissez un niveau"
              options={(["vert", "orange", "rouge"] as Niveau[]).map((n) => ({
                valeur: n,
                libelle: MOT[n],
              }))}
              value={niveauChoisi}
              onChange={(e) => setNiveauChoisi(e.target.value as Niveau)}
            />
            <Liste
              label="Raison"
              obligatoire
              placeholder="Choisissez une raison"
              options={RAISONS_CORRECTION.map((r) => ({ valeur: r, libelle: r }))}
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
            />
            <ZoneTexte
              label="Commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>
        ) : null}
      </Carte>

      <BarreAction>
        <Bouton
          taille="grand"
          onClick={valider}
          chargement={envoi}
          className="w-full sm:w-auto"
        >
          {(correction ? niveauChoisi : niveau) === "vert"
            ? "Terminer la consultation"
            : "Continuer vers l'orientation"}
        </Bouton>
      </BarreAction>
    </>
  );
}
