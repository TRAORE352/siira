"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Champ } from "@/components/Champs";
import { MessageErreur } from "@/components/Interface";
import {
  ESPACE_ACTIF,
  mentionEspace,
  presentationEspace,
  roleAutorise,
  titreEspace,
} from "@/lib/espaces";
import {
  ACCUEIL_PAR_ROLE,
  connecterParMatricule,
  fermerSession,
  lireSession,
} from "@/lib/session";

/**
 * Connexion par numéro matricule et mot de passe.
 *
 * Deux volets : à gauche la marque sur fond prune, à droite le formulaire.
 * L'écran tient sur une page, sans défilement. Phase 1 : tout matricule et
 * tout mot de passe ouvrent l'espace ; la vérification viendra du serveur.
 */
export function ConnexionComptes() {
  const router = useRouter();
  const [matricule, setMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurMatricule, setErreurMatricule] = useState<string | undefined>();
  const [envoi, setEnvoi] = useState(false);

  /* Déjà connecté : on renvoie vers son espace. */
  useEffect(() => {
    const profil = lireSession();
    if (!profil) return;
    if (!roleAutorise(ESPACE_ACTIF, profil.role)) {
      fermerSession();
      return;
    }
    router.replace(ACCUEIL_PAR_ROLE[profil.role]);
  }, [router]);

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setErreurMatricule(undefined);

    if (!matricule.trim()) {
      setErreurMatricule("Indiquez votre numéro matricule.");
      return;
    }
    if (!motDePasse) {
      setErreur("Indiquez votre mot de passe.");
      return;
    }

    const resultat = connecterParMatricule(matricule.trim(), motDePasse);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setEnvoi(true);
    router.replace(ACCUEIL_PAR_ROLE[resultat.profil.role]);
  }

  const mention = mentionEspace(ESPACE_ACTIF);

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] overflow-hidden lg:grid-cols-2 lg:grid-rows-1">
      {/* Panneau de marque */}
      <aside className="fond-marque flex flex-col justify-between px-6 py-6 lg:px-14 lg:py-16">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/icon-512.png"
            alt=""
            width={44}
            height={44}
            priority
            className="rounded-[0.85rem] bg-white/95 p-1.5"
            style={{ width: 44, height: 44 }}
          />
          <span className="font-[family-name:var(--font-titre)] text-2xl text-white">
            S<span className="text-rose-400">ii</span>ra
          </span>
        </div>

        <div className="hidden lg:block lg:max-w-md">
          {mention ? (
            <p className="text-sm font-medium tracking-wide text-rose-300 uppercase">
              {mention}
            </p>
          ) : null}
          <h1 className="mt-3 text-3xl leading-tight text-white lg:text-[2.5rem]">
            {titreEspace(ESPACE_ACTIF)}
          </h1>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-rose-100/75">
            {presentationEspace(ESPACE_ACTIF)}
          </p>
        </div>

        <p className="hidden text-xs leading-relaxed text-rose-100/50 lg:block">
          Siira ne pose pas de diagnostic.
        </p>
      </aside>

      {/* Formulaire */}
      <main className="flex items-center justify-center overflow-hidden bg-sable-50 px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl">Se connecter</h2>
          <p className="mt-2 text-prune-700">
            Entrez votre numéro matricule et votre mot de passe.
          </p>

          <form onSubmit={soumettre} noValidate className="mt-6 flex flex-col gap-4">
            {erreur ? <MessageErreur titre="Connexion impossible" texte={erreur} /> : null}

            <Champ
              label="Numéro matricule"
              type="text"
              autoComplete="username"
              obligatoire
              value={matricule}
              erreur={erreurMatricule}
              onChange={(e) => setMatricule(e.target.value)}
            />

            <Champ
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              obligatoire
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />

            <Bouton
              type="submit"
              taille="grand"
              chargement={envoi}
              className="w-full shadow-[var(--shadow-action)]"
            >
              Se connecter
            </Bouton>
          </form>

          <p className="mt-6 text-center text-sm">
            Pas de compte ?{" "}
            <Link
              href="/inscription"
              className="inline-flex min-h-[var(--spacing-cible)] items-center px-2 font-medium text-rose-700 underline-offset-4 hover:underline"
            >
              Créer un compte
            </Link>
          </p>

          {ESPACE_ACTIF === "complet" ? (
            <p className="mt-6 text-center text-sm">
              {/*
                Cible tactile de 44 px, sans allonger la page : la marge
                négative annule la hauteur ajoutée au bloc. L'écran tient sans
                défilement, c'est voulu.
              */}
              <Link
                href="/design"
                className="-my-3 inline-flex min-h-[var(--spacing-cible)] items-center px-2 text-rose-700 underline-offset-4 hover:underline"
              >
                Voir le système de design
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
