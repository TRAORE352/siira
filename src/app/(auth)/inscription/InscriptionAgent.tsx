"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ, Liste } from "@/components/Champs";
import { ChampCode } from "@/components/ChampsConnexion";
import { MessageErreur } from "@/components/Interface";
import { creerCompteAgent, listerStructuresDeBase, trouverCompteParMatricule } from "@/lib/data";
import { InscriptionRefusee, matriculeNormalise, validerInscription } from "@/lib/comptes";
import type { ChampInscription, Inscription } from "@/lib/comptes";
import { LIBELLE_STATUT_AGENT } from "@/lib/libelles";
import { ouvrirSession, ouvrirSessionReelle } from "@/lib/session";
import { AuthRefusee, inscrire } from "@/lib/supabase/auth";
import { supabaseEstConfigure } from "@/lib/supabase/environnement";
import type { StatutAgent } from "@/lib/types";

const VIDE: Inscription = {
  nom: "",
  prenom: "",
  statut: "",
  centre_sante: "",
  matricule: "",
  mot_de_passe: "",
  confirmation: "",
};

const STATUTS: StatutAgent[] = [
  "infirmier_etat",
  "medecin_generaliste",
  "agent_communautaire",
];

/**
 * Création du compte d'un agent.
 *
 * Six réponses, en trois groupes courts : qui elle ou il est, où le travail se
 * fait, et de quoi se souvenir pour revenir. À la fin, l'agent entre
 * directement dans son espace — on ne demande pas de se connecter juste après
 * s'être inscrit.
 */
export function InscriptionAgent() {
  const router = useRouter();
  const [f, setF] = useState<Inscription>(VIDE);
  const [erreurs, setErreurs] = useState<Partial<Record<ChampInscription, string>>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function set<K extends keyof Inscription>(cle: K, valeur: Inscription[K]) {
    setF((e) => ({ ...e, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
  }

  /*
    Création du compte. Quand Supabase est configuré, le compte est RÉEL : il
    vit dans la base, survit au vidage du cache et s'ouvre depuis un autre
    téléphone. Sans configuration, on retombe sur le compte de démonstration
    local — c'est ce qui permet de montrer le parcours sans réseau.
  */
  async function creer() {
    setErreurGenerale(null);

    /* On valide d'abord : inutile d'appeler le serveur pour un champ vide. */
    const fautes = validerInscription(f, []);
    if (Object.keys(fautes).length > 0) {
      setErreurs(fautes);
      setErreurGenerale("Vérifiez les informations signalées.");
      return;
    }

    setEnvoi(true);
    try {
      if (supabaseEstConfigure()) {
        const profil = await inscrire({
          nom: f.nom.trim(),
          prenoms: f.prenom.trim(),
          statut: f.statut || undefined,
          centre_sante: f.centre_sante.trim(),
          matricule: matriculeNormalise(f.matricule),
          motDePasse: f.mot_de_passe,
          role: "agent",
        });
        ouvrirSessionReelle(profil);
      } else {
        const compte = creerCompteAgent(f);
        ouvrirSession(compte.profil.id);
      }
      router.replace("/agent");
    } catch (e) {
      setEnvoi(false);
      if (e instanceof InscriptionRefusee) {
        setErreurs(e.fautes);
        setErreurGenerale("Vérifiez les informations signalées.");
        return;
      }
      if (e instanceof AuthRefusee) {
        setErreurGenerale(e.message);
        return;
      }
      setErreurGenerale("Le compte n'a pas pu être créé. Réessayez dans un instant.");
    }
  }

  const structures = listerStructuresDeBase();

  /* Le matricule saisi est-il déjà pris ? On le dit avant l'envoi. */
  const matriculePris =
    f.matricule.trim().length >= 4 && trouverCompteParMatricule(f.matricule) !== null;

  return (
    <div className="flex min-h-screen flex-col bg-prune-900">
      <div className="fond-marque px-6 pt-10 pb-14">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Image
            src="/brand/icon-512.png"
            alt=""
            width={52}
            height={52}
            priority
            className="rounded-[1rem] bg-white/95 p-1.5"
            style={{ width: 52, height: 52 }}
          />
          <p className="text-[0.95rem] text-rose-100/85">Espace des agents de santé</p>
        </div>
      </div>

      <main id="contenu" className="feuille relative -mt-6 flex-1 px-6 pt-8 pb-12">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl">Créer un compte</h1>
          <p className="mt-2 text-sm text-sable-600">
            Ces informations servent à votre suivi et à celui de vos patientes.
          </p>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void creer();
            }}
            className="mt-6 flex flex-col gap-8"
          >
            {erreurGenerale ? (
              <MessageErreur titre="Compte non créé" texte={erreurGenerale} />
            ) : null}

            <section className="flex flex-col gap-4">
              <h2 className="text-[1.05rem] font-medium text-prune-900">Qui êtes-vous ?</h2>

              <Champ
                label="Nom de famille"
                obligatoire
                autoComplete="family-name"
                value={f.nom}
                erreur={erreurs.nom}
                onChange={(e) => set("nom", e.target.value)}
              />

              <Champ
                label="Prénom"
                obligatoire
                autoComplete="given-name"
                value={f.prenom}
                erreur={erreurs.prenom}
                onChange={(e) => set("prenom", e.target.value)}
              />

              <Liste
                label="Statut"
                obligatoire
                placeholder="Choisissez votre statut"
                options={STATUTS.map((s) => ({ valeur: s, libelle: LIBELLE_STATUT_AGENT[s] }))}
                value={f.statut}
                erreur={erreurs.statut}
                onChange={(e) => set("statut", e.target.value as StatutAgent)}
              />
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-[1.05rem] font-medium text-prune-900">
                Où travaillez-vous ?
              </h2>

              {/*
                * Une liste, pas un champ libre : deux agents du même CSPS
                * l'écrivaient différemment (« CSPS Dassasgho », « csps de
                * dassasgho »), et le centre recevait des dossiers venus d'un
                * lieu qu'il ne pouvait pas regrouper. La commune accompagne le
                * nom car plusieurs CSPS portent celui de leur quartier.
                */}
              <Liste
                label="Centre de santé"
                obligatoire
                aide="Celui où vous recevez les patientes."
                placeholder="Choisissez votre centre"
                value={f.centre_sante}
                erreur={erreurs.centre_sante}
                options={structures.map((s) => ({
                  valeur: s.nom,
                  libelle: `${s.nom} — ${s.service}`,
                }))}
                onChange={(e) => set("centre_sante", e.target.value)}
              />
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-[1.05rem] font-medium text-prune-900">
                Vos identifiants
              </h2>

              <Champ
                label="Matricule d'agent"
                obligatoire
                autoComplete="off"
                aide="Celui de votre carte professionnelle."
                placeholder="AG-1042"
                value={f.matricule}
                erreur={
                  erreurs.matricule ??
                  (matriculePris ? "Ce matricule est déjà utilisé." : undefined)
                }
                onChange={(e) => set("matricule", matriculeNormalise(e.target.value))}
              />

              <ChampCode
                label="Mot de passe"
                aide="6 chiffres, à retenir."
                valeur={f.mot_de_passe}
                erreur={erreurs.mot_de_passe}
                onChange={(v) => set("mot_de_passe", v)}
              />

              <ChampCode
                label="Confirmer le mot de passe"
                valeur={f.confirmation}
                erreur={erreurs.confirmation}
                onChange={(v) => set("confirmation", v)}
              />
            </section>

            <button
              type="submit"
              disabled={envoi}
              className="pression flex min-h-[3.4rem] w-full items-center justify-center rounded-[var(--radius-moyen)] bg-rose-600 px-5 text-[1.05rem] font-medium text-white shadow-[var(--shadow-action)] hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-sable-200 disabled:text-sable-500 disabled:shadow-none"
            >
              {envoi ? "Création du compte…" : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-sable-600">
            Vous avez déjà un compte ?{" "}
            <Link
              href="/connexion"
              className="inline-flex min-h-[var(--spacing-cible)] items-center px-2 font-medium text-rose-700 underline-offset-4 hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
