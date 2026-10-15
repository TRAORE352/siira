"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Champ } from "@/components/Champs";
import { Carte, MessageErreur } from "@/components/Interface";
import { Logo } from "@/components/Logo";
import {
  ESPACE_ACTIF,
  LIBELLE_ROLE,
  comptesDeLespace,
  mentionEspace,
  roleAutorise,
  rolesEspace,
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

export default function Connexion() {
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
    <main id="contenu" className="mx-auto w-full max-w-md px-5 py-10 sm:py-16">
      <Logo taille="moyen" lien={false} />

      <h1 className="mt-8 text-3xl">Se connecter</h1>
      {mention ? (
        <p className="mt-2 text-sm font-medium tracking-wide text-rose-700 uppercase">{mention}</p>
      ) : (
        <p className="mt-2 text-prune-700">
          Entrez les informations de votre compte pour ouvrir votre espace.
        </p>
      )}

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

        <Bouton type="submit" taille="grand" chargement={envoi} className="w-full">
          Se connecter
        </Bouton>
      </form>

      {/* Comptes de démonstration : la connexion n'est pas encore reliée à un
          serveur, ces boutons ouvrent directement l'espace correspondant. Sur
          une adresse dédiée, seuls les comptes de cet espace sont proposés. */}
      <section aria-labelledby="titre-demo" className="mt-10">
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
    </main>
  );
}
