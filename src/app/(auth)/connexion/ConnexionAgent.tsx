"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton";
import { ChampCode, ChampTelephone } from "@/components/ChampsConnexion";
import { MessageErreur } from "@/components/Interface";
import {
  ACCUEIL_PAR_ROLE,
  fermerSession,
  lireSession,
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

/**
 * Connexion de l'agent de santé.
 *
 * Deux informations, rien d'autre : son numéro de téléphone et son code à
 * 6 chiffres. Pas de courriel, pas de mot de passe à retenir, pas de compte de
 * démonstration à choisir dans une liste — l'écran doit ressembler à ce que
 * l'agent ouvrira tous les matins, pas à une maquette.
 *
 * Phase 1 : tout numéro burkinabè valide et tout code à 6 chiffres ouvrent
 * l'espace. La vérification viendra du serveur en Phase 2 ; cet écran ne
 * changera pas.
 */
export function ConnexionAgent() {
  const router = useRouter();
  const [numero, setNumero] = useState("");
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

  function entrer() {
    setErreur(null);
    const fauteTel = erreurNumero(numero);
    const fauteCode = erreurCode(code);
    setErreurTel(fauteTel ?? undefined);
    setErreurSecret(fauteCode ?? undefined);
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

  const complet = numeroValide(numero) && codeValide(code);

  return (
    <div className="flex min-h-screen flex-col bg-prune-900">
      {/* Bandeau de marque. Il porte l'identité, le contenu vient par-dessus. */}
      <div className="fond-marque px-6 pt-12 pb-16 sm:pt-16">
        <div className="mx-auto w-full max-w-md">
          <Image
            src="/brand/icon-512.png"
            alt=""
            width={56}
            height={56}
            priority
            className="rounded-[1.1rem] bg-white/95 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            style={{ width: 56, height: 56 }}
          />
          <h1 className="mt-6 font-[family-name:var(--font-titre)] text-[2.1rem] leading-[1.15] text-white">
            Le chemin
            <br />
            vers les soins
          </h1>
          <p className="mt-3 max-w-xs text-[1.02rem] leading-relaxed text-rose-100/85">
            Espace des agents de santé. Dépistez, orientez, suivez vos patientes
            depuis votre téléphone.
          </p>
        </div>
      </div>

      {/* Feuille de saisie, remontée sur le bandeau. */}
      <main id="contenu" className="feuille relative -mt-7 flex-1 px-6 pt-8 pb-12">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl">Connexion</h2>
          <p className="mt-1.5 text-[0.95rem] text-sable-600">
            Entrez le numéro sur lequel votre compte a été créé.
          </p>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              entrer();
            }}
            className="mt-7 flex flex-col gap-6"
          >
            {erreur ? <MessageErreur titre="Connexion impossible" texte={erreur} /> : null}

            <ChampTelephone
              valeur={numero}
              onChange={(v) => {
                setNumero(v);
                if (erreurTel) setErreurTel(undefined);
              }}
              erreur={erreurTel}
            />

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

          <p className="mt-7 text-center text-sm leading-relaxed text-sable-600">
            Code oublié ou numéro changé ?{" "}
            <span className="font-medium text-prune-800">
              Appelez le superviseur de votre district.
            </span>
          </p>

          <p className="mt-8 border-t border-sable-200 pt-5 text-center text-xs leading-relaxed text-sable-500">
            Siira ne pose pas de diagnostic. Il évalue un niveau d’urgence et
            oriente vers un centre spécialisé.
          </p>
        </div>
      </main>
    </div>
  );
}
