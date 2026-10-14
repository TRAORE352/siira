"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarreAction, Espace, Retour } from "@/components/Espace";
import { Bouton } from "@/components/Bouton";
import { CaseACocher, Champ, ChoixUnique, Liste, ZoneTexte } from "@/components/Champs";
import { Carte, MessageErreur, MessageInfo, TitreSection } from "@/components/Interface";
import { analyserConsultation, creerPatiente, listerDistricts } from "@/lib/data";
import { useDictee } from "@/lib/dictee";
import { LIBELLE_PAIEMENT } from "@/lib/libelles";
import { useSession } from "@/lib/session";
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

export default function NouvelleConsultation() {
  return (
    <Espace role="agent">
      <Formulaire />
    </Espace>
  );
}

function Formulaire() {
  const router = useRouter();
  const { profil } = useSession();
  // Le brouillon est relu au tout premier rendu navigateur, pas dans un effet :
  // l'agent retrouve sa saisie sans voir l'écran se remplir après coup.
  const [f, setF] = useState<Brouillon>(lireBrouillon);
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Brouillon, string>>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState(false);

  // Brouillon : l'agent peut quitter l'écran sans rien perdre.
  useEffect(() => {
    window.sessionStorage.setItem(CLE_BROUILLON, JSON.stringify(f));
  }, [f]);

  const dictee = useDictee((texte) =>
    setF((e) => ({ ...e, recit: e.recit ? `${e.recit} ${texte}` : texte })),
  );

  function set<K extends keyof Brouillon>(cle: K, valeur: Brouillon[K]) {
    setF((e) => ({ ...e, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
  }

  function verifier(): boolean {
    const e: Partial<Record<keyof Brouillon, string>> = {};
    if (!f.nom.trim()) e.nom = "Indiquez le nom de la patiente.";
    const age = Number(f.age);
    if (!f.age.trim()) e.age = "Indiquez l'âge de la patiente.";
    else if (!Number.isInteger(age) || age < 15 || age > 100)
      e.age = "L'âge doit être un nombre entre 15 et 100.";
    if (!f.district_id) e.district_id = "Choisissez le district de la patiente.";
    if (f.telephone && !/^\d{8}$/.test(f.telephone))
      e.telephone = "Le téléphone doit contenir 8 chiffres.";
    if (!f.capacite_paiement)
      e.capacite_paiement = "Indiquez ce que la patiente peut payer.";
    if (f.recit.trim().length < 20)
      e.recit = "Décrivez un peu plus ce que ressent la patiente.";
    setErreurs(e);
    return Object.keys(e).length === 0;
  }

  async function analyser() {
    setErreurGenerale(null);
    if (!verifier()) {
      // Amener l'agent sur le premier champ en faute.
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
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
        "L'analyse n'a pas abouti. Vérifiez les informations et recommencez.",
      );
    }
  }

  const districts = listerDistricts();
  const pret = f.consentement && !analyse;

  return (
    <>
      <Retour href="/agent" libelle="Mes patientes" />
      <TitreSection aide="Remplissez la fiche avec la patiente, puis décrivez ce qu'elle ressent.">
        Nouvelle consultation
      </TitreSection>

      {erreurGenerale ? (
        <MessageErreur texte={erreurGenerale} className="mb-4" />
      ) : null}

      <Carte>
        <h3 className="mb-4 text-lg">Qui est la patiente</h3>
        <div className="flex flex-col gap-4">
          <Champ
            label="Nom"
            obligatoire
            autoComplete="off"
            value={f.nom}
            erreur={erreurs.nom}
            onChange={(e) => set("nom", e.target.value)}
          />
          <Champ
            label="Âge"
            obligatoire
            type="number"
            inputMode="numeric"
            min={15}
            max={100}
            aide="Entre 15 et 100 ans."
            value={f.age}
            erreur={erreurs.age}
            onChange={(e) => set("age", e.target.value)}
          />
          <Liste
            label="District"
            obligatoire
            placeholder="Choisissez un district"
            options={districts.map((d) => ({ valeur: d.id, libelle: d.nom }))}
            value={f.district_id}
            erreur={erreurs.district_id}
            onChange={(e) => set("district_id", e.target.value)}
          />
          <Champ
            label="Village ou quartier"
            value={f.village}
            onChange={(e) => set("village", e.target.value)}
          />
          <Champ
            label="Téléphone"
            type="tel"
            inputMode="numeric"
            aide="8 chiffres, sans espace."
            value={f.telephone}
            erreur={erreurs.telephone}
            onChange={(e) => set("telephone", e.target.value.replace(/\D/g, ""))}
          />
          <ChoixUnique
            legende="Ce que la patiente peut payer"
            nom="paiement"
            valeur={f.capacite_paiement || null}
            erreur={erreurs.capacite_paiement}
            onChange={(v) => set("capacite_paiement", v)}
            options={(
              ["ne_peut_pas", "partielle", "peut_payer"] as CapacitePaiement[]
            ).map((v) => ({ valeur: v, libelle: LIBELLE_PAIEMENT[v] }))}
          />
        </div>
      </Carte>

      <Carte className="mt-4">
        <h3 className="mb-4 text-lg">Ce que ressent la patiente</h3>

        {dictee.disponible ? (
          <div className="mb-4">
            <Bouton
              type="button"
              variante={dictee.enCours ? "danger" : "second"}
              onClick={dictee.enCours ? dictee.arreter : dictee.demarrer}
              className="w-full sm:w-auto"
            >
              {dictee.enCours ? "Arrêter la dictée" : "Dicter le récit"}
            </Bouton>
            {dictee.enCours ? (
              <p role="status" className="mt-2 text-sm text-rose-700">
                La dictée est en cours. Parlez normalement, puis touchez
                «&nbsp;Arrêter la dictée&nbsp;».
              </p>
            ) : null}
            {dictee.erreur ? (
              <p role="alert" className="mt-2 text-sm font-medium text-rouge-fort">
                {dictee.erreur}
              </p>
            ) : null}
          </div>
        ) : (
          <MessageInfo>
            La dictée n&apos;est pas disponible sur ce navigateur. Écrivez le récit
            ci-dessous.
          </MessageInfo>
        )}

        <div className="mt-4">
          <ZoneTexte
            label="Récit"
            obligatoire
            aide="Écrivez avec ses mots : depuis quand, quel sein, ce qu'elle sent, ce qu'elle voit."
            maxLength={2000}
            value={f.recit}
            erreur={erreurs.recit}
            compteur={{ actuel: f.recit.length, max: 2000 }}
            onChange={(e) => set("recit", e.target.value)}
          />
        </div>
      </Carte>

      <div className="mt-4">
        <CaseACocher
          checked={f.consentement}
          onChange={(v) => set("consentement", v)}
          aide="Lisez cette phrase à la patiente avant de cocher."
          label="La patiente accepte que ses informations soient enregistrées et transmises au centre de soins."
        />
      </div>

      <BarreAction>
        <Bouton
          taille="grand"
          onClick={analyser}
          disabled={!pret}
          chargement={analyse}
          className="w-full sm:w-auto"
        >
          Analyser le cas
        </Bouton>
      </BarreAction>
    </>
  );
}
