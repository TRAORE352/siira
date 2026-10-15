"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * Parcours en étapes.
 *
 * Une question à la fois, sur un écran de téléphone tenu d'une main. L'agent
 * remplit la fiche **avec la patiente, en lui parlant** : un formulaire long
 * l'oblige à chercher où il en est entre deux phrases. Découper en étapes
 * courtes lui laisse les yeux sur la patiente plutôt que sur l'écran.
 */

/* ------------------------------------------------------------------ */
/* En-tête : où j'en suis                                               */
/* ------------------------------------------------------------------ */

export function EnTeteEtapes({
  etape,
  total,
  titre,
  sousTitre,
  onRetour,
}: {
  /** Numéro de l'étape en cours, à partir de 1. */
  etape: number;
  total: number;
  titre: string;
  sousTitre?: string;
  /** Retour à l'étape précédente, ou à la liste depuis la première. */
  onRetour: () => void;
}) {
  const part = Math.round((etape / total) * 100);

  return (
    <header className="fond-marque px-4 pt-5 pb-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRetour}
            className="pression flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/15"
          >
            <span className="lecteur-seul">Revenir à l’étape précédente</span>
            <span aria-hidden="true" className="text-lg leading-none">
              ←
            </span>
          </button>

          <p className="chiffres-fixes text-sm text-rose-100/75">
            Étape {etape} sur {total}
          </p>
        </div>

        {/*
          Barre d'avancement. `aria-hidden` : l'information est déjà donnée en
          toutes lettres juste au-dessus, la répéter encombrerait la lecture
          d'écran sans rien apporter.
        */}
        <div aria-hidden="true" className="mt-4 h-1 w-full rounded-full bg-white/15">
          <div
            className="avancement h-1 rounded-full bg-rose-400"
            style={{ width: `${part}%` }}
          />
        </div>

        <h1 className="mt-6 font-[family-name:var(--font-titre)] text-[1.7rem] leading-tight text-white">
          {titre}
        </h1>
        {sousTitre ? (
          <p className="mt-2 text-[0.98rem] leading-relaxed text-rose-100/75">{sousTitre}</p>
        ) : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Corps de l'étape                                                     */
/* ------------------------------------------------------------------ */

/**
 * Contenu d'une étape, posé sur la feuille claire.
 * `cle` change à chaque étape : React remonte le bloc, ce qui rejoue
 * l'animation d'entrée. Sans cette clé, passer d'une étape à l'autre ne
 * produirait aucun mouvement.
 */
export function CorpsEtape({ cle, children }: { cle: string; children: ReactNode }) {
  return (
    /*
      `pb-40` et non `pb-32` : la barre basse porte parfois une phrase d'aide
      au-dessus du bouton, ce qui la fait grandir. Une réserve calée sur le cas
      court masquerait le dernier champ de l'étape.
    */
    <main id="contenu" className="feuille relative -mt-6 flex-1 px-4 pt-7 pb-40 sm:px-6">
      <div key={cle} className="mx-auto w-full max-w-2xl">
        <div className="cascade flex flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Barre d'action basse                                                 */
/* ------------------------------------------------------------------ */

export function BarreEtape({
  libelle,
  onContinuer,
  actif,
  chargement = false,
  aide,
}: {
  libelle: string;
  onContinuer: () => void;
  actif: boolean;
  chargement?: boolean;
  /** Phrase courte affichée au-dessus du bouton, quand il est bloqué. */
  aide?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sable-200 bg-white/92 pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-onglets)] backdrop-blur">
      <div className="mx-auto w-full max-w-2xl px-4 py-3 sm:px-6">
        {aide ? (
          <p className="mb-2 text-center text-sm text-sable-600">{aide}</p>
        ) : null}
        <button
          type="button"
          onClick={onContinuer}
          disabled={!actif || chargement}
          aria-busy={chargement || undefined}
          className={clsx(
            "pression flex min-h-[3.4rem] w-full items-center justify-center gap-2 rounded-[var(--radius-moyen)] px-5 text-[1.05rem] font-medium transition-colors",
            actif && !chargement
              ? "bg-rose-600 text-white shadow-[var(--shadow-action)] hover:bg-rose-700"
              : "cursor-not-allowed bg-sable-200 text-sable-500",
          )}
        >
          {chargement ? (
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : null}
          {libelle}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Question                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une question du parcours : son intitulé en grand, l'aide en dessous, puis la
 * saisie. L'intitulé est un `label` seulement quand il pilote un champ unique ;
 * sinon la saisie porte ses propres libellés.
 */
export function Question({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[1.15rem] leading-snug font-medium text-prune-900">{titre}</h2>
      {aide ? <p className="mt-1 text-sm leading-relaxed text-sable-600">{aide}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Récapitulatif d'une étape déjà franchie : ce que l'agent a répondu, et un
 * moyen d'y revenir. Évite de faire défiler tout le parcours pour corriger.
 */
export function Rappel({
  libelle,
  valeur,
  onModifier,
}: {
  libelle: string;
  valeur: string;
  onModifier: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-moyen)] border border-sable-200 bg-sable-100/60 px-3.5 py-2.5">
      <span className="min-w-0">
        <span className="block text-xs text-sable-500">{libelle}</span>
        <span className="block truncate text-[0.95rem] font-medium text-prune-900">
          {valeur}
        </span>
      </span>
      <button
        type="button"
        onClick={onModifier}
        className="min-h-[var(--spacing-cible)] shrink-0 px-1 text-sm font-medium text-rose-700 underline-offset-4 hover:underline"
      >
        Modifier
      </button>
    </div>
  );
}
