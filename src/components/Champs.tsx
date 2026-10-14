"use client";

import { clsx } from "clsx";
import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const CADRE =
  "w-full rounded-[var(--radius-moyen)] border bg-white px-3.5 py-3 text-base " +
  "text-prune-900 placeholder:text-sable-400 min-h-[var(--spacing-cible)] " +
  "transition-colors";

const NORMAL = "border-sable-300 focus:border-rose-600";
const FAUTIF = "border-rouge-fort bg-rouge-bg/40";

function Enveloppe({
  id,
  label,
  aide,
  erreur,
  obligatoire,
  children,
}: {
  id: string;
  label: string;
  aide?: string;
  erreur?: string;
  obligatoire?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.95rem] font-medium text-prune-800">
        {label}
        {obligatoire ? (
          <span className="ml-1 text-rose-600" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 font-normal text-sable-500">(facultatif)</span>
        )}
      </label>
      {aide ? (
        <p id={`${id}-aide`} className="text-sm text-sable-600">
          {aide}
        </p>
      ) : null}
      {children}
      {erreur ? (
        <p id={`${id}-erreur`} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-rouge-fort">
          <span aria-hidden="true">!</span>
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

export function Champ({
  label,
  aide,
  erreur,
  obligatoire,
  className,
  id: idFourni,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  aide?: string;
  erreur?: string;
  obligatoire?: boolean;
}) {
  const genere = useId();
  const id = idFourni ?? genere;
  return (
    <Enveloppe id={id} label={label} aide={aide} erreur={erreur} obligatoire={obligatoire}>
      <input
        {...rest}
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={clsx(aide && `${id}-aide`, erreur && `${id}-erreur`) || undefined}
        className={clsx(CADRE, erreur ? FAUTIF : NORMAL, className)}
      />
    </Enveloppe>
  );
}

export function ZoneTexte({
  label,
  aide,
  erreur,
  obligatoire,
  compteur,
  className,
  id: idFourni,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  aide?: string;
  erreur?: string;
  obligatoire?: boolean;
  compteur?: { actuel: number; max: number };
}) {
  const genere = useId();
  const id = idFourni ?? genere;
  return (
    <Enveloppe id={id} label={label} aide={aide} erreur={erreur} obligatoire={obligatoire}>
      <textarea
        {...rest}
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={clsx(aide && `${id}-aide`, erreur && `${id}-erreur`) || undefined}
        className={clsx(CADRE, "min-h-36 resize-y leading-relaxed", erreur ? FAUTIF : NORMAL, className)}
      />
      {compteur ? (
        <p className="text-right text-sm text-sable-500" aria-live="polite">
          {compteur.actuel} sur {compteur.max} caracteres
        </p>
      ) : null}
    </Enveloppe>
  );
}

export function Liste({
  label,
  aide,
  erreur,
  obligatoire,
  options,
  placeholder,
  className,
  id: idFourni,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  aide?: string;
  erreur?: string;
  obligatoire?: boolean;
  placeholder?: string;
  options: { valeur: string; libelle: string }[];
}) {
  const genere = useId();
  const id = idFourni ?? genere;
  return (
    <Enveloppe id={id} label={label} aide={aide} erreur={erreur} obligatoire={obligatoire}>
      <select
        {...rest}
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={clsx(aide && `${id}-aide`, erreur && `${id}-erreur`) || undefined}
        className={clsx(CADRE, "appearance-none bg-[length:12px] pr-10", erreur ? FAUTIF : NORMAL, className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath fill='%237a5e6b' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 1rem center",
        }}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </Enveloppe>
  );
}

/** Groupe de choix exclusifs, presente en grandes cibles tactiles. */
export function ChoixUnique({
  legende,
  aide,
  erreur,
  nom,
  valeur,
  onChange,
  options,
  colonnes = 1,
}: {
  legende: string;
  aide?: string;
  erreur?: string;
  nom: string;
  valeur: string | null;
  onChange: (v: string) => void;
  options: { valeur: string; libelle: string; detail?: string }[];
  colonnes?: 1 | 2 | 3;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 text-[0.95rem] font-medium text-prune-800">{legende}</legend>
      {aide ? (
        <p className="mb-1 text-sm text-sable-600" id={`${id}-aide`}>
          {aide}
        </p>
      ) : null}
      <div
        className={clsx(
          "grid gap-2",
          colonnes === 1 && "grid-cols-1",
          colonnes === 2 && "grid-cols-2",
          colonnes === 3 && "grid-cols-3",
        )}
      >
        {options.map((o) => {
          const actif = valeur === o.valeur;
          return (
            <label
              key={o.valeur}
              className={clsx(
                "flex min-h-[var(--spacing-cible)] cursor-pointer items-start gap-3 rounded-[var(--radius-moyen)] border p-3 transition-colors",
                actif
                  ? "border-rose-600 bg-rose-50 ring-1 ring-rose-600"
                  : "border-sable-300 bg-white hover:bg-sable-100",
              )}
            >
              <input
                type="radio"
                name={nom}
                value={o.valeur}
                checked={actif}
                onChange={() => onChange(o.valeur)}
                className="mt-1 h-5 w-5 shrink-0 accent-rose-600"
              />
              <span>
                <span className="block text-[0.95rem] font-medium text-prune-900">{o.libelle}</span>
                {o.detail ? <span className="block text-sm text-sable-600">{o.detail}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
      {erreur ? (
        <p role="alert" className="text-sm font-medium text-rouge-fort">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  );
}

export function CaseACocher({
  label,
  aide,
  erreur,
  checked,
  onChange,
}: {
  label: ReactNode;
  aide?: string;
  erreur?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={clsx(
          "flex cursor-pointer items-start gap-3 rounded-[var(--radius-moyen)] border p-4 transition-colors",
          checked ? "border-rose-600 bg-rose-50" : "border-sable-300 bg-white hover:bg-sable-100",
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={aide ? `${id}-aide` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-rose-600"
        />
        <span className="text-[0.95rem] text-prune-900">{label}</span>
      </label>
      {aide ? (
        <p id={`${id}-aide`} className="text-sm text-sable-600">
          {aide}
        </p>
      ) : null}
      {erreur ? (
        <p role="alert" className="text-sm font-medium text-rouge-fort">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
