"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Champ } from "@/components/Champs";
import { ChampCode, ChampTelephone } from "@/components/ChampsConnexion";
import { MessageErreur } from "@/components/Interface";
import {
  ACCUEIL_PAR_ROLE,
  fermerSession,
  lireSession,
  ouvrirSession,
  ouvrirSessionParNumero,
} from "@/lib/session";
import { ESPACE_ACTIF, roleAutorise } from "@/lib/espaces";
import {
  codeValide,
  erreurCode,
  erreurNumero,
  numeroCanonique,
  numeroValide,
} from "@/lib/telephone";
import { matriculeNormalise } from "@/lib/comptes";
import { AuthRefusee, connecter } from "@/lib/supabase/auth";
import { supabaseEstConfigure } from "@/lib/supabase/environnement";

/**
 * Connexion de l'agent de santé.
 *
 * Deux informations, rien d'autre : son numéro de téléphone et son code à
 * 6 chiffres. Pas de courriel, pas de mot de passe à retenir, pas de compte de
 * démonstration à choisir dans une liste — l'écran doit ressembler à ce que
 * l'agent ouvrira tous les matins, pas à une maquette.
 *
 * Deux modes, selon que la base est configurée ou non. Avec Supabase, l'agent
 * entre son MATRICULE — c'est l'identifiant de son compte réel, celui qu'il a
 * choisi à l'inscription, et la vérification est faite par le serveur. Sans
 * configuration, l'écran reste celui de la démonstration : un numéro burkinabè
 * et un code à 6 chiffres ouvrent l'espace sans réseau.
 *
 * Le numéro n'identifie PAS un compte réel : l'inscription crée le compte sur
 * le matricule. Demander le téléphone en mode réel rendrait tout compte
 * impossible à ouvrir.
 */
export function ConnexionAgent() {
  const router = useRouter();
  const reel = supabaseEstConfigure();
  const [numero, setNumero] = useState("");
  const [matricule, setMatricule] = useState("");
  const [code, setCode] = useState("");
  const [erreurTel, setErreurTel] = useState<string | undefined>();
  const [erreurSecret, setErreurSecret] = useState<string | undefined>();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  /* Déjà connecté : on ouvre directement son espace. */
  useEffect(() => {
    const profil = lireSession();
    if (!profil) return;
    if (!roleAutorise(ESPACE_ACTIF, profil.role)) {
      fermerSession();
      return;
    }
    router.replace(ACCUEIL_PAR_ROLE[profil.role]);
  }, [router]);

  async function entrer() {
    setErreur(null);
    const fauteCode = erreurCode(code);
    setErreurSecret(fauteCode ?? undefined);

    if (reel) {
      const fauteMat = matricule.trim().length < 4 ? "Entrez votre matricule." : null;
      setErreurTel(fauteMat ?? undefined);
      if (fauteMat || fauteCode) return;

      setEnvoi(true);
      try {
        const profil = await connecter(matriculeNormalise(matricule), code);
        if (!roleAutorise(ESPACE_ACTIF, profil.role)) {
          setEnvoi(false);
          setErreur("Ce compte n’ouvre pas cet espace.");
          return;
        }
        ouvrirSession(profil.id);
        router.replace(ACCUEIL_PAR_ROLE[profil.role]);
      } catch (e) {
        setEnvoi(false);
        setErreur(
          e instanceof AuthRefusee
            ? e.message
            : "Impossible d’ouvrir votre espace. Réessayez dans un instant.",
        );
      }
      return;
    }

    const fauteTel = erreurNumero(numero);
    setErreurTel(fauteTel ?? undefined);
    if (fauteTel || fauteCode) return;

    setEnvoi(true);
    const profil = ouvrirSessionParNumero(numeroCanonique(numero));
    if (!profil) {
      setEnvoi(false);
      setErreur("Impossible d’ouvrir votre espace. Réessayez dans un instant.");
      return;
    }
    router.replace(ACCUEIL_PAR_ROLE[profil.role]);
  }

  const complet = reel
    ? matricule.trim().length >= 4 && codeValide(code)
    : numeroValide(numero) && codeValide(code);

  return (
    <div className="flex min-h-screen flex-col bg-prune-900">
      {/*
        Bandeau de marque. Il dit seulement où l'on est : l'agent ouvre cet
        écran tous les matins, le slogan et la présentation de l'application
        n'ont rien à y faire — chaque ligne de texte en plus est une ligne à
        lire avant de pouvoir travailler.
      */}
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

      {/* Feuille de saisie, remontée sur le bandeau. */}
      <main
        id="contenu"
        className="feuille relative -mt-6 flex flex-1 flex-col px-6 pt-8 pb-10"
      >
        {/*
          Le bloc est centré verticalement : sur un téléphone de 844 px, une
          feuille vide sous le bouton donne l'impression d'un écran inachevé.
        */}
        <div className="mx-auto my-auto w-full max-w-md">
          <h1 className="text-2xl">Connexion</h1>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void entrer();
            }}
            className="mt-6 flex flex-col gap-6"
          >
            {erreur ? <MessageErreur titre="Connexion impossible" texte={erreur} /> : null}

            {reel ? (
              <Champ
                label="Matricule d'agent"
                obligatoire
                autoComplete="username"
                placeholder="AG-1042"
                value={matricule}
                erreur={erreurTel}
                onChange={(e) => {
                  setMatricule(matriculeNormalise(e.target.value));
                  if (erreurTel) setErreurTel(undefined);
                }}
              />
            ) : (
              <ChampTelephone
                valeur={numero}
                onChange={(v) => {
                  setNumero(v);
                  if (erreurTel) setErreurTel(undefined);
                }}
                erreur={erreurTel}
              />
            )}

            <ChampCode
              valeur={code}
              onChange={(v) => {
                setCode(v);
                if (erreurSecret) setErreurSecret(undefined);
              }}
              erreur={erreurSecret}
            />

            <Bouton
              type="submit"
              taille="grand"
              chargement={envoi}
              className={complet ? "w-full shadow-[var(--shadow-action)]" : "w-full"}
            >
              Ouvrir mon espace
            </Bouton>
          </form>

          <p className="mt-6 text-center text-sm text-sable-600">
            Code oublié ?{" "}
            <span className="font-medium text-prune-800">Appelez votre superviseur.</span>
          </p>

          <p className="mt-4 text-center text-sm text-sable-600">
            Pas encore de compte ?{" "}
            <Link
              href="/inscription"
              className="inline-flex min-h-[var(--spacing-cible)] items-center px-2 font-medium text-rose-700 underline-offset-4 hover:underline"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
