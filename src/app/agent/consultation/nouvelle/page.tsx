"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Espace } from "@/components/Espace";
import { CaseACocher, Champ, Liste, ZoneTexte } from "@/components/Champs";
import { MessageErreur, MessageInfo } from "@/components/Interface";
import {
  BarreEtape,
  CorpsEtape,
  EnTeteEtapes,
  Pliant,
  Question,
  Rappel,
} from "@/components/Parcours";
import { analyserConsultation, creerPatiente, listerDistricts } from "@/lib/data";
import { useDictee } from "@/lib/dictee";
import { LIBELLE_PAIEMENT } from "@/lib/libelles";
import { useSession } from "@/lib/session";
import { chiffresSeuls, erreurNumero, formaterNumero } from "@/lib/telephone";
import type { CapacitePaiement } from "@/lib/types";

const CLE_BROUILLON = "siira.brouillon.consultation";

interface Brouillon {
  nom: string;
  age: string;
  district_id: string;
  village: string;
  telephone: string;
  capacite_paiement: string;
  consentement: boolean;
  recit: string;
}

const VIDE: Brouillon = {
  nom: "",
  age: "",
  district_id: "",
  village: "",
  telephone: "",
  capacite_paiement: "",
  consentement: false,
  recit: "",
};

/** Brouillon enregistré, ou formulaire vide. */
function lireBrouillon(): Brouillon {
  if (typeof window === "undefined") return VIDE;
  const brut = window.sessionStorage.getItem(CLE_BROUILLON);
  if (!brut) return VIDE;
  try {
    return { ...VIDE, ...(JSON.parse(brut) as Brouillon) };
  } catch {
    return VIDE;
  }
}

/* Les cinq temps de la consultation, dans l'ordre où l'agent les vit. */
const ETAPES = [
  { titre: "Qui est la patiente ?", sousTitre: "Son nom et son âge." },
  { titre: "Où habite-t-elle ?", sousTitre: "Pour choisir le centre le plus proche." },
  {
    titre: "Peut-elle payer les soins ?",
    sousTitre: "Une ONG partenaire peut prendre le relais.",
  },
  {
    titre: "Que ressent-elle ?",
    sousTitre: "Avec ses mots à elle. Vous pouvez dicter.",
  },
  { titre: "Son accord", sousTitre: "Lisez-lui cette phrase avant de continuer." },
] as const;

const TOTAL = ETAPES.length;

/*
 * Ce qu'un interrogatoire du sein demande. La liste sert de guide à la dictée :
 * l'agent lit les questions, la patiente répond, et le récit contient alors
 * tout ce qu'il faut pour remplir la fiche et classer le cas. Elle reprend,
 * dans l'ordre, les champs de la fiche structurée.
 */
const QUESTIONS_RECIT = [
  "Depuis combien de temps ?",
  "Un seul sein ou les deux ?",
  "Sentez-vous une boule ? Où, et depuis quand ?",
  "La boule est-elle dure ? Bouge-t-elle sous les doigts ?",
  "La peau a-t-elle changé : tirée, en peau d'orange, une plaie, une rougeur ?",
  "Le mamelon est-il rentré depuis peu ?",
  "Y a-t-il un écoulement ? Avec du sang ? D'un seul côté ?",
  "Sentez-vous une boule sous l'aisselle ?",
  "A-t-elle mal, et à un endroit précis ?",
  "A-t-elle déjà eu un cancer du sein ? Y en a-t-il dans la famille ?",
  "A-t-elle de la fièvre, le sein est-il chaud et rouge ?",
  "Est-elle enceinte, ou allaite-t-elle ?",
  "Ses règles se sont-elles arrêtées ?",
];

export default function NouvelleConsultation() {
  return (
    <Espace role="agent" entete="aucun">
      <Parcours />
    </Espace>
  );
}

function Parcours() {
  const router = useRouter();
  const { profil } = useSession();
  const [f, setF] = useState<Brouillon>(lireBrouillon);
  const [etape, setEtape] = useState(1);
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Brouillon, string>>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState(false);

  /* Brouillon : l'agent peut quitter l'écran sans rien perdre. */
  useEffect(() => {
    window.sessionStorage.setItem(CLE_BROUILLON, JSON.stringify(f));
  }, [f]);

  /* Chaque changement d'étape ramène en haut : l'étape précédente peut être
     plus longue que l'écran, et arriver au milieu d'une question désoriente. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [etape]);

  const dictee = useDictee((texte) =>
    setF((e) => ({ ...e, recit: e.recit ? `${e.recit} ${texte}` : texte })),
  );

  const districts = useMemo(() => listerDistricts(), []);

  function set<K extends keyof Brouillon>(cle: K, valeur: Brouillon[K]) {
    setF((e) => ({ ...e, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
  }

  /** Fautes de l'étape courante, s'il y en a. */
  function fautes(n: number): Partial<Record<keyof Brouillon, string>> {
    const e: Partial<Record<keyof Brouillon, string>> = {};
    if (n === 1) {
      if (!f.nom.trim()) e.nom = "Indiquez le nom de la patiente.";
      const age = Number(f.age);
      if (!f.age.trim()) e.age = "Indiquez l’âge de la patiente.";
      else if (!Number.isInteger(age) || age < 15 || age > 100)
        e.age = "L’âge doit être un nombre entre 15 et 100.";
    }
    if (n === 2) {
      if (!f.district_id) e.district_id = "Choisissez le district de la patiente.";
      if (f.telephone) {
        const faute = erreurNumero(f.telephone);
        if (faute) e.telephone = faute;
      }
    }
    if (n === 3 && !f.capacite_paiement) {
      e.capacite_paiement = "Indiquez ce que la patiente peut payer.";
    }
    if (n === 4 && f.recit.trim().length < 20) {
      e.recit = "Décrivez un peu plus ce que ressent la patiente.";
    }
    return e;
  }

  /** L'étape courante est-elle complète ? Pilote l'activation du bouton. */
  const complete = useMemo(() => {
    if (etape === 5) return f.consentement;
    return Object.keys(fautes(etape)).length === 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape, f]);

  function avancer() {
    const e = fautes(etape);
    if (Object.keys(e).length > 0) {
      setErreurs(e);
      window.setTimeout(
        () => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        0,
      );
      return;
    }
    if (etape < TOTAL) {
      setEtape((n) => n + 1);
      return;
    }
    analyser();
  }

  function reculer() {
    if (etape === 1) {
      router.push("/agent");
      return;
    }
    setEtape((n) => n - 1);
  }

  async function analyser() {
    setErreurGenerale(null);
    if (!profil) return;

    setAnalyse(true);
    try {
      const patiente = creerPatiente({
        agent_id: profil.id,
        nom: f.nom.trim(),
        age: Number(f.age),
        district_id: f.district_id,
        village: f.village.trim() || null,
        telephone: f.telephone.trim() || null,
        capacite_paiement: f.capacite_paiement as CapacitePaiement,
        consentement: f.consentement,
      });
      const resultat = analyserConsultation({
        patiente_id: patiente.id,
        agent_id: profil.id,
        recit: f.recit.trim(),
      });
      window.sessionStorage.removeItem(CLE_BROUILLON);
      router.push(`/agent/consultation/${resultat.consultation.id}/resultat`);
    } catch {
      setAnalyse(false);
      setErreurGenerale(
        "L’analyse n’a pas abouti. Vérifiez les informations et recommencez.",
      );
    }
  }

  const courante = ETAPES[etape - 1];
  const district = districts.find((d) => d.id === f.district_id);

  return (
    <>
      <EnTeteEtapes
        etape={etape}
        total={TOTAL}
        titre={courante.titre}
        sousTitre={courante.sousTitre}
        onRetour={reculer}
      />

      <CorpsEtape cle={`etape-${etape}`}>
        {erreurGenerale ? <MessageErreur texte={erreurGenerale} /> : null}

        {/* Étape 1 — identité */}
        {etape === 1 ? (
          <>
            <Question titre="Son nom">
              <Champ
                label="Nom de la patiente"
                labelMasque
                obligatoire
                autoComplete="off"
                autoFocus
                value={f.nom}
                erreur={erreurs.nom}
                onChange={(e) => set("nom", e.target.value)}
              />
            </Question>

            <Question titre="Son âge" aide="Entre 15 et 100 ans.">
              <Champ
                label="Âge"
                labelMasque
                obligatoire
                type="number"
                inputMode="numeric"
                min={15}
                max={100}
                value={f.age}
                erreur={erreurs.age}
                onChange={(e) => set("age", e.target.value)}
              />
            </Question>
          </>
        ) : null}

        {/* Étape 2 — lieu de vie */}
        {etape === 2 ? (
          <>
            <Rappel libelle="Patiente" valeur={f.nom} onModifier={() => setEtape(1)} />

            <Question
              titre="Son district"
              aide="Siira s’en sert pour proposer le centre le plus proche d’elle."
            >
              <Liste
                label="District"
                labelMasque
                obligatoire
                placeholder="Choisissez un district"
                options={districts.map((d) => ({ valeur: d.id, libelle: d.nom }))}
                value={f.district_id}
                erreur={erreurs.district_id}
                onChange={(e) => set("district_id", e.target.value)}
              />
            </Question>

            <Question
              titre="Son village ou quartier"
              aide="Facultatif, mais utile pour la retrouver."
            >
              <Champ
                label="Village ou quartier"
                labelMasque
                value={f.village}
                onChange={(e) => set("village", e.target.value)}
              />
            </Question>

            <Question
              titre="Son téléphone"
              aide="Facultatif. Celui d’un proche convient si elle n’en a pas."
            >
              <Champ
                label="Téléphone"
                labelMasque
                type="tel"
                inputMode="numeric"
                value={formaterNumero(f.telephone)}
                erreur={erreurs.telephone}
                onChange={(e) => set("telephone", chiffresSeuls(e.target.value))}
              />
            </Question>
          </>
        ) : null}

        {/* Étape 3 — capacité de paiement */}
        {etape === 3 ? (
          <>
            <Rappel
              libelle="Patiente"
              valeur={`${f.nom}, ${f.age} ans${district ? ` · ${district.nom}` : ""}`}
              onModifier={() => setEtape(1)}
            />

            <Question
              titre="Ce qu’elle peut payer"
              aide="Posez-lui la question simplement. Sa réponse ne change rien aux soins proposés."
            >
              <ChoixPaiement
                valeur={f.capacite_paiement}
                erreur={erreurs.capacite_paiement}
                onChange={(v) => set("capacite_paiement", v)}
              />
            </Question>
          </>
        ) : null}

        {/* Étape 4 — le récit */}
        {etape === 4 ? (
          <>
            <Question
              titre="Ce qu’elle ressent"
              aide="Depuis quand, quel sein, ce qu’elle sent, ce qu’elle voit. Gardez ses mots à elle."
            >
              {dictee.disponible ? (
                <BoutonDictee dictee={dictee} />
              ) : (
                <MessageInfo>
                  La dictée n’est pas disponible sur ce navigateur. Écrivez le récit
                  ci-dessous.
                </MessageInfo>
              )}

              {/*
                Le guide d'interrogatoire reste plié : l'écran ne montre que le
                bouton et la zone de texte, et l'agent ouvre la liste quand il
                veut la suivre question par question.
              */}
              <div className="mt-4">
                <Pliant titre="Questions à lui poser">
                  <ul className="flex flex-col gap-1.5 text-[0.95rem] leading-relaxed text-prune-800">
                    {QUESTIONS_RECIT.map((q) => (
                      <li key={q} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-sable-600">
                    Ces réponses remplissent la fiche, qui sert au classement puis au
                    spécialiste.
                  </p>
                </Pliant>
              </div>

              {/* La zone est haute : le récit est le cœur du dossier. */}
              <div className="mt-4">
                <ZoneTexte
                  label="Récit"
                  labelMasque
                  obligatoire
                  maxLength={2000}
                  className="min-h-52"
                  value={f.recit}
                  erreur={erreurs.recit}
                  compteur={{ actuel: f.recit.length, max: 2000 }}
                  onChange={(e) => set("recit", e.target.value)}
                />
              </div>
            </Question>
          </>
        ) : null}

        {/* Étape 5 — consentement */}
        {etape === 5 ? (
          <>
            <RecapitulatifFinal
              nom={f.nom}
              age={f.age}
              district={district?.nom ?? ""}
              paiement={LIBELLE_PAIEMENT[f.capacite_paiement as CapacitePaiement] ?? ""}
              recit={f.recit}
              aller={setEtape}
            />

            <Question titre="Ce qu’elle accepte">
              <CaseACocher
                checked={f.consentement}
                onChange={(v) => set("consentement", v)}
                label="La patiente accepte que ses informations soient enregistrées et transmises au centre de soins."
              />
            </Question>
          </>
        ) : null}
      </CorpsEtape>

      <BarreEtape
        libelle={etape === TOTAL ? "Analyser le cas" : "Continuer"}
        onContinuer={avancer}
        actif={complete}
        chargement={analyse}
        aide={
          etape === TOTAL && !f.consentement
            ? "L’accord de la patiente est obligatoire."
            : undefined
        }
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Capacité de paiement : trois grandes cibles                          */
/* ------------------------------------------------------------------ */

const PAIEMENTS: { valeur: CapacitePaiement; detail: string }[] = [
  { valeur: "ne_peut_pas", detail: "Une ONG partenaire sera sollicitée." },
  { valeur: "partielle", detail: "Le reste pourra être financé." },
  { valeur: "peut_payer", detail: "Aucune demande de financement." },
];

function ChoixPaiement({
  valeur,
  erreur,
  onChange,
}: {
  valeur: string;
  erreur?: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset
      className="border-0 p-0"
      /*
       * L'état fautif appartient au groupe, pas à chaque bouton : le rôle
       * `radio` ne porte pas `aria-invalid`. Le `fieldset` le porte, et le
       * message lui est rattaché par `aria-describedby`.
       */
      aria-invalid={erreur ? true : undefined}
      aria-describedby={erreur ? "paiement-erreur" : undefined}
    >
      <legend className="lecteur-seul">Ce que la patiente peut payer</legend>
      <div className="flex flex-col gap-2.5">
        {PAIEMENTS.map((p) => {
          const actif = valeur === p.valeur;
          return (
            <label
              key={p.valeur}
              className={clsx(
                "pression flex cursor-pointer items-start gap-3 rounded-[var(--radius-grand)] border p-4",
                actif
                  ? "border-rose-600 bg-rose-50 ring-1 ring-rose-600"
                  : "border-sable-300 bg-white hover:bg-sable-50",
              )}
            >
              <input
                type="radio"
                name="paiement"
                value={p.valeur}
                checked={actif}
                onChange={() => onChange(p.valeur)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-rose-600"
              />
              <span className="min-w-0">
                <span className="block font-medium text-prune-900">
                  {LIBELLE_PAIEMENT[p.valeur]}
                </span>
                <span className="mt-0.5 block text-sm text-sable-600">{p.detail}</span>
              </span>
            </label>
          );
        })}
      </div>
      {erreur ? (
        <p id="paiement-erreur" role="alert" className="mt-2 text-sm font-medium text-rouge-fort">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Dictée                                                               */
/* ------------------------------------------------------------------ */

function BoutonDictee({ dictee }: { dictee: ReturnType<typeof useDictee> }) {
  return (
    <div>
      <button
        type="button"
        onClick={dictee.enCours ? dictee.arreter : dictee.demarrer}
        className={clsx(
          "pression flex min-h-[3.4rem] w-full items-center justify-center gap-2.5 rounded-[var(--radius-moyen)] border text-[1.02rem] font-medium",
          dictee.enCours
            ? "border-rouge-fort bg-rouge-bg text-rouge-texte"
            : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "inline-block h-2.5 w-2.5 rounded-full",
            dictee.enCours ? "animate-pulse bg-rouge-fort" : "bg-rose-600",
          )}
        />
        {dictee.enCours ? "Arrêter la dictée" : "Dicter le récit"}
      </button>

      {dictee.enCours ? (
        <p role="status" className="mt-2 text-sm text-rose-700">
          Parlez normalement, puis touchez « Arrêter la dictée ».
        </p>
      ) : null}
      {dictee.erreur ? (
        <p role="alert" className="mt-2 text-sm font-medium text-rouge-fort">
          {dictee.erreur}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Récapitulatif avant analyse                                          */
/* ------------------------------------------------------------------ */

function RecapitulatifFinal({
  nom,
  age,
  district,
  paiement,
  recit,
  aller,
}: {
  nom: string;
  age: string;
  district: string;
  paiement: string;
  recit: string;
  aller: (n: number) => void;
}) {
  return (
    <div className="rounded-[var(--radius-grand)] border border-sable-200 bg-white p-4 shadow-[var(--shadow-carte)]">
      <h2 className="text-[1.05rem] font-medium text-prune-900">Avant d’analyser</h2>
      <p className="mt-0.5 text-sm text-sable-600">
        Relisez avec elle. Vous pouvez encore corriger.
      </p>

      <dl className="mt-4 flex flex-col">
        <LigneRecap libelle="Patiente" valeur={`${nom}, ${age} ans`} onModifier={() => aller(1)} />
        <LigneRecap libelle="District" valeur={district} onModifier={() => aller(2)} />
        <LigneRecap libelle="Paiement" valeur={paiement} onModifier={() => aller(3)} />
      </dl>

      <div className="mt-3 border-t border-sable-200 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-sable-600">Ce qu’elle ressent</dt>
          <button
            type="button"
            onClick={() => aller(4)}
            className="min-h-[var(--spacing-cible)] text-sm font-medium text-rose-700 underline-offset-4 hover:underline"
          >
            Modifier
          </button>
        </div>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-prune-800">{recit}</p>
      </div>
    </div>
  );
}

function LigneRecap({
  libelle,
  valeur,
  onModifier,
}: {
  libelle: string;
  valeur: string;
  onModifier: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-sable-200 py-2.5 last:border-0">
      <dt className="shrink-0 text-sm text-sable-600">{libelle}</dt>
      <dd className="flex min-w-0 items-baseline gap-3">
        <span className="truncate text-[0.95rem] font-medium text-prune-900">{valeur}</span>
        <button
          type="button"
          onClick={onModifier}
          className="min-h-[var(--spacing-cible)] shrink-0 text-sm font-medium text-rose-700 underline-offset-4 hover:underline"
        >
          Modifier
        </button>
      </dd>
    </div>
  );
}
