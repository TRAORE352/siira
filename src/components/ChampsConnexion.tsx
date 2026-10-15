"use client";

import { clsx } from "clsx";
import { useId, useRef, useState } from "react";
import { INDICATIF, LONGUEUR_CODE, LONGUEUR_NUMERO, chiffresSeuls, formaterNumero } from "@/lib/telephone";

/**
 * Champs de connexion de l'agent.
 *
 * Deux saisies seulement, pensées pour un pouce sur un téléphone d'entrée de
 * gamme : le numéro, avec l'indicatif fixé à côté, et le code à 6 chiffres.
 */

/* ------------------------------------------------------------------ */
/* Numéro de téléphone                                                  */
/* ------------------------------------------------------------------ */

export function ChampTelephone({
  valeur,
  onChange,
  erreur,
  onEntree,
}: {
  /** Chiffres seuls, sans indicatif. */
  valeur: string;
  onChange: (chiffres: string) => void;
  erreur?: string;
  onEntree?: () => void;
}) {
  const id = useId();
  const [focus, setFocus] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.95rem] font-medium text-prune-800">
        Numéro de téléphone
      </label>

      <div
        className={clsx(
          "flex items-stretch overflow-hidden rounded-[var(--radius-moyen)] border bg-white transition-colors",
          erreur
            ? "border-rouge-fort"
            : focus
              ? "border-rose-600 ring-2 ring-rose-600/20"
              : "border-sable-300",
        )}
      >
        {/*
          L'indicatif n'est pas saisissable : au Burkina Faso il ne change
          jamais, et le laisser modifiable n'offre qu'une occasion de se
          tromper. Il est lu par les lecteurs d'écran grâce au libellé du champ.
        */}
        <span
          aria-hidden="true"
          className="chiffres-fixes flex shrink-0 items-center border-r border-sable-200 bg-sable-100 px-3.5 text-[1.05rem] font-medium text-prune-800"
        >
          {INDICATIF}
        </span>

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          enterKeyHint="next"
          /* 8 chiffres affichés par groupes de 2 : « 70 12 34 56 » = 11 signes. */
          maxLength={LONGUEUR_NUMERO + 3}
          placeholder="70 12 34 56"
          aria-label={`Numéro de téléphone, indicatif ${INDICATIF}`}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? `${id}-erreur` : undefined}
          value={formaterNumero(valeur)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => onChange(chiffresSeuls(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEntree) {
              e.preventDefault();
              onEntree();
            }
          }}
          className="chiffres-fixes min-h-[3.25rem] w-full bg-transparent px-3.5 text-[1.15rem] tracking-wide text-prune-900 placeholder:font-normal placeholder:tracking-normal placeholder:text-sable-400 focus:outline-none"
        />
      </div>

      {erreur ? (
        <p id={`${id}-erreur`} role="alert" className="text-sm font-medium text-rouge-fort">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Code à 6 chiffres                                                    */
/* ------------------------------------------------------------------ */

/**
 * Six cases, mais **un seul champ de saisie**.
 *
 * Les six `input` séparés que l'on voit partout cassent le collage, le clavier
 * numérique de certains téléphones et la lecture d'écran. Ici un champ unique,
 * rendu invisible mais bien présent, reçoit la frappe ; les six cases ne font
 * que montrer ce qu'il contient. Toucher n'importe quelle case redonne le
 * focus au champ.
 */
export function ChampCode({
  valeur,
  onChange,
  erreur,
  onComplet,
}: {
  valeur: string;
  onChange: (chiffres: string) => void;
  erreur?: string;
  /** Appelé dès que les 6 chiffres sont saisis. */
  onComplet?: (code: string) => void;
}) {
  const id = useId();
  const champ = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  const [montrer, setMontrer] = useState(false);

  const cases = Array.from({ length: LONGUEUR_CODE }, (_, i) => valeur[i] ?? "");
  const position = Math.min(valeur.length, LONGUEUR_CODE - 1);

  function saisir(brut: string) {
    const c = brut.replace(/\D/g, "").slice(0, LONGUEUR_CODE);
    onChange(c);
    if (c.length === LONGUEUR_CODE) onComplet?.(c);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.95rem] font-medium text-prune-800">
          Code secret
        </label>
        <button
          type="button"
          onClick={() => setMontrer((m) => !m)}
          className="min-h-[var(--spacing-cible)] text-sm font-medium text-rose-700 underline-offset-4 hover:underline"
        >
          {montrer ? "Masquer le code" : "Afficher le code"}
        </button>
      </div>

      {/*
        Le clic sur la rangée redonne le focus au champ. Aucune directive de
        lint n'est nécessaire : le champ couvre déjà toute la surface et porte
        lui-même l'interaction clavier.
      */}
      <div className="relative" onClick={() => champ.current?.focus()}>
        <input
          ref={champ}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="go"
          maxLength={LONGUEUR_CODE}
          aria-label="Code secret à 6 chiffres"
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? `${id}-erreur` : undefined}
          value={valeur}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => saisir(e.target.value)}
          /*
            Le champ couvre toute la rangée et reste réellement focusable : il
            est rendu transparent, jamais retiré du flux ni masqué par
            `display:none`, ce qui le couperait du clavier.
          */
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />

        <div aria-hidden="true" className="grid grid-cols-6 gap-2">
          {cases.map((chiffre, i) => {
            const remplie = chiffre !== "";
            const courante = focus && i === position && valeur.length < LONGUEUR_CODE;
            return (
              <div
                key={i}
                className={clsx(
                  "flex h-14 items-center justify-center rounded-[var(--radius-moyen)] border text-xl font-semibold transition-colors",
                  "chiffres-fixes",
                  erreur
                    ? "border-rouge-fort bg-rouge-bg/40 text-rouge-texte"
                    : remplie
                      ? "border-rose-600 bg-rose-50 text-prune-900"
                      : courante
                        ? "case-active border-rose-600 bg-white"
                        : "border-sable-300 bg-white",
                )}
              >
                {remplie ? (montrer ? chiffre : "•") : ""}
              </div>
            );
          })}
        </div>
      </div>

      {erreur ? (
        <p id={`${id}-erreur`} role="alert" className="text-sm font-medium text-rouge-fort">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
