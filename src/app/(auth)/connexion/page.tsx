"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Champ } from "@/components/Champs";
import { Carte, MessageErreur } from "@/components/Interface";
import { Logo } from "@/components/Logo";
import {
  ACCUEIL_PAR_ROLE,
  LIBELLE_ROLE,
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

  // Déjà connecté : on renvoie directement vers son espace.
  useEffect(() => {
    const profil = lireSession();
    if (profil) router.replace(ACCUEIL_PAR_ROLE[profil.role]);
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
    if (!motDePasse) {
      setErreur("Indiquez votre mot de passe.");
      return;
    }
    entrer(profil);
  }

  const comptes = listerComptesDemo();

  return (
    <main id="contenu" className="mx-auto w-full max-w-md px-5 py-10 sm:py-16">
      <Logo taille="moyen" lien={false} />

      <h1 className="mt-8 text-3xl">Se connecter</h1>
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

        <Bouton type="submit" taille="grand" chargement={envoi} className="w-full">
          Se connecter
        </Bouton>
      </form>

      {/* Comptes de démonstration : la connexion n'est pas encore reliée à un
          serveur, ces boutons ouvrent directement l'espace correspondant. */}
      <section aria-labelledby="titre-demo" className="mt-10">
        <h2 id="titre-demo" className="text-xl">
          Comptes de démonstration
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
