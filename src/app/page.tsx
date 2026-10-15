"use client";

import Link from "next/link";
import { Installation } from "@/components/Installation";
import { Logo } from "@/components/Logo";
import { MarqueAnimee } from "@/components/MarqueAnimee";
import {
  ESPACE_ACTIF,
  mentionEspace,
  presentationEspace,
  titreEspace,
} from "@/lib/espaces";

/*
 * Page d'entrée d'une adresse.
 * Sur une adresse dédiée, elle ne parle que de son public : l'agent ne voit pas
 * de lien vers l'espace du centre, et réciproquement. Sur l'application
 * complète, elle reste la page de présentation du projet.
 */
export default function Accueil() {
  if (ESPACE_ACTIF === "ferme") return <AdresseFermee />;
  if (ESPACE_ACTIF === "agent") return <AccueilAgent />;
  return <AccueilGeneral />;
}

/* ------------------------------------------------------------------ */
/* Adresse dont l'espace a été retiré                                   */
/* ------------------------------------------------------------------ */

/**
 * Une adresse peut survivre à son espace : la variable d'environnement vit
 * chez l'hébergeur, et personne ne la retire en même temps que le code.
 * Plutôt que de se rabattre sur l'application complète — ce qui ouvrirait
 * tous les écrans à une adresse qui ne devrait plus rien ouvrir — on le dit,
 * et on n'offre aucune porte d'entrée.
 */
function AdresseFermee() {
  return (
    <main
      id="contenu"
      className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center"
    >
      <Logo taille="moyen" lien={false} />

      <h1 className="mt-8 text-3xl">{titreEspace(ESPACE_ACTIF)}</h1>

      <p className="mt-4 text-prune-700">{presentationEspace(ESPACE_ACTIF)}</p>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Agent : écran d'entrée plein écran, sur le téléphone                 */
/* ------------------------------------------------------------------ */

function AccueilAgent() {
  return (
    <div className="fond-marque flex min-h-screen flex-col">
      <main
        id="contenu"
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-20 pb-10 text-center sm:pt-24"
      >
        {/*
          Un écran d'entrée n'a pas à expliquer le produit : l'agent a été
          formée, elle vient travailler. La marque, une phrase, une action.
          Le détail du parcours vit dans les écrans qui le font réellement.
        */}
        <MarqueAnimee taille={88} />

        <h1 className="entree-titre mt-8 font-[family-name:var(--font-titre)] text-[2.6rem] leading-[1.08] text-white">
          Le chemin
          <br />
          vers les soins
        </h1>

        <p className="entree-phrase mt-5 max-w-[19rem] text-[1.05rem] leading-relaxed text-rose-100/75">
          Dépister, orienter, suivre. Depuis votre téléphone, même sans bon
          réseau.
        </p>

        {/* L'action occupe le bas de l'écran, à portée du pouce. */}
        <div className="entree-action mt-auto w-full pt-12">
          <Link
            href="/connexion"
            className="pression flex min-h-[3.5rem] w-full items-center justify-center rounded-[var(--radius-moyen)] bg-rose-600 px-5 text-[1.05rem] font-medium text-white shadow-[var(--shadow-action)] hover:bg-rose-700"
          >
            Ouvrir mon espace
          </Link>

          <p className="mt-5 text-xs leading-relaxed text-rose-100/50">
            {mentionEspace(ESPACE_ACTIF)} · Siira ne pose pas de diagnostic.
          </p>

          {/*
            L'invitation d'installation n'apparaît que si le navigateur la
            propose réellement.
          */}
          <Installation />
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Centre et application complète : écran d'ordinateur                  */
/* ------------------------------------------------------------------ */

function AccueilGeneral() {
  const mention = mentionEspace(ESPACE_ACTIF);

  return (
    <main
      id="contenu"
      className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16"
    >
      <Logo taille="grand" lien={false} />

      {mention ? (
        <p className="mt-6 text-sm font-medium tracking-wide text-rose-700 uppercase">
          {mention}
        </p>
      ) : null}

      <h1 className="mt-3 text-4xl">{titreEspace(ESPACE_ACTIF)}</h1>
      <p className="mt-3 text-lg text-prune-700">{presentationEspace(ESPACE_ACTIF)}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/connexion"
          className="pression inline-flex min-h-[var(--spacing-cible)] items-center justify-center rounded-[var(--radius-moyen)] bg-rose-600 px-5 py-3 font-medium text-white shadow-[var(--shadow-action)] hover:bg-rose-700"
        >
          Se connecter
        </Link>
        {ESPACE_ACTIF === "complet" ? (
          <Link
            href="/design"
            className="pression inline-flex min-h-[var(--spacing-cible)] items-center justify-center rounded-[var(--radius-moyen)] border border-sable-300 bg-white px-5 py-3 font-medium text-prune-900 hover:bg-sable-100"
          >
            Système de design
          </Link>
        ) : null}
      </div>
    </main>
  );
}
