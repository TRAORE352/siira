"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Champ } from "@/components/Champs";
import { Carte, MessageErreur } from "@/components/Interface";
import {
  ESPACE_ACTIF,
  LIBELLE_ROLE,
  comptesDeLespace,
  mentionEspace,
  presentationEspace,
  roleAutorise,
  rolesEspace,
  titreEspace,
} from "@/lib/espaces";
import {
  ACCUEIL_PAR_ROLE,
  fermerSession,
  listerComptesDemo,
  lireSession,
  ouvrirSession,
  trouverCompte,
} from "@/lib/session";
import type { Profil } from "@/lib/types";

/**
 * Connexion par compte (centre spécialisé, équipe Siira), en pleine page.
 *
 * Deux volets : à gauche la marque sur fond prune, à droite le formulaire.
 * Sur ordinateur, les deux se partagent l'écran ; sur téléphone, la marque
 * s'empile au-dessus du formulaire.
 */
export function ConnexionComptes() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurEmail, setErreurEmail] = useState<string | undefined>();
  const [envoi, setEnvoi] = useState(false);

  /*
   * Déjà connecté : on renvoie vers son espace. Si le rôle connecté n'est pas
   * celui de cette adresse (cas d'une session laissée par une autre version),
   * la session est fermée plutôt que de provoquer une boucle de redirection.
   */
  useEffect(() => {
    const profil = lireSession();
    if (!profil) return;
    if (!roleAutorise(ESPACE_ACTIF, profil.role)) {
      fermerSession();
      return;
    }
    router.replace(ACCUEIL_PAR_ROLE[profil.role]);
  }, [router]);

  function entrer(profil: Profil) {
    setEnvoi(true);
    ouvrirSession(profil.id);
    router.replace(ACCUEIL_PAR_ROLE[profil.role]);
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setErreurEmail(undefined);

    if (!email.trim()) {
      setErreurEmail("Indiquez votre adresse e-mail.");
      return;
    }
    const profil = trouverCompte(email);
    if (!profil) {
      setErreur(
        "Cette adresse ne correspond à aucun compte. Choisissez un compte de démonstration ci-dessous.",
      );
      return;
    }
    if (!roleAutorise(ESPACE_ACTIF, profil.role)) {
      setErreur(
        `Ce compte n’ouvre pas cet espace. Il sert au rôle « ${LIBELLE_ROLE[profil.role]} ».`,
      );
      return;
    }
    if (!motDePasse) {
      setErreur("Indiquez votre mot de passe.");
      return;
    }
    entrer(profil);
  }

  const comptes = comptesDeLespace(ESPACE_ACTIF, listerComptesDemo());
  const mention = mentionEspace(ESPACE_ACTIF);
  const roleUnique = rolesEspace(ESPACE_ACTIF).length === 1;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque */}
      <aside className="fond-marque flex flex-col gap-12 px-8 py-10 lg:gap-0 lg:justify-between lg:px-14 lg:py-16">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/icon-512.png"
            alt=""
            width={48}
            height={48}
            priority
            className="rounded-[0.9rem] bg-white/95 p-1.5"
            style={{ width: 48, height: 48 }}
          />
          <span className="font-[family-name:var(--font-titre)] text-2xl text-white">
            S<span className="text-rose-400">ii</span>ra
          </span>
        </div>

        <div className="lg:max-w-md">
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

        <p className="text-xs leading-relaxed text-rose-100/50">
          Siira ne pose pas de diagnostic.
        </p>
      </aside>

      {/* Formulaire */}
      <main
        id="contenu"
        className="flex items-center justify-center bg-sable-50 px-6 py-12 lg:py-16"
      >
        <div className="cascade w-full max-w-md">
          <h2 className="text-3xl">Se connecter</h2>
          <p className="mt-2 text-prune-700">
            Entrez les informations de votre compte pour ouvrir votre espace.
          </p>

          <form onSubmit={soumettre} noValidate className="mt-6 flex flex-col gap-4">
            {erreur ? <MessageErreur titre="Connexion impossible" texte={erreur} /> : null}

            <Champ
              label="Adresse e-mail"
              type="email"
              inputMode="email"
              autoComplete="username"
              obligatoire
              value={email}
              erreur={erreurEmail}
              onChange={(e) => setEmail(e.target.value)}
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

          {/* Séparateur entre la saisie et les comptes de démonstration. */}
          <div className="my-9 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-sable-200" />
            <span className="text-xs font-medium tracking-wide text-sable-500 uppercase">ou</span>
            <span className="h-px flex-1 bg-sable-200" />
          </div>

          <section aria-labelledby="titre-demo">
            <h2 id="titre-demo" className="text-xl">
              {roleUnique ? "Compte de démonstration" : "Comptes de démonstration"}
            </h2>
            <p className="mt-1 text-sm text-sable-600">
              Version de démonstration : touchez un compte pour ouvrir son espace.
            </p>

            <ul className="mt-4 flex flex-col gap-2">
              {comptes.map((p) => (
                <li key={p.id}>
                  <Carte className="p-0">
                    <button
                      type="button"
                      onClick={() => entrer(p)}
                      className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-grand)] px-4 py-3 text-left transition-colors hover:bg-sable-100"
                    >
                      <span>
                        <span className="block font-medium text-prune-900">{p.nom}</span>
                        <span className="block text-sm text-sable-600">
                          {p.centre_sante ?? LIBELLE_ROLE[p.role]}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-sable-300 px-2.5 py-0.5 text-xs font-medium text-prune-700">
                        {LIBELLE_ROLE[p.role]}
                      </span>
                    </button>
                  </Carte>
                </li>
              ))}
            </ul>
          </section>

          {ESPACE_ACTIF === "complet" ? (
            <p className="mt-8 text-center text-sm">
              <Link href="/design" className="text-rose-700 underline-offset-4 hover:underline">
                Voir le système de design
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
