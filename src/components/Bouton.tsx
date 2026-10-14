"use client";

import { clsx } from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "principal" | "second" | "discret" | "danger";
type Taille = "normal" | "grand";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-moyen)] " +
  "font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
  "min-h-[var(--spacing-cible)] px-4 text-center";

const VARIANTES: Record<Variante, string> = {
  principal:
    "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 disabled:bg-sable-300 disabled:text-sable-600",
  second:
    "bg-white text-prune-900 border border-sable-300 hover:bg-sable-100 active:bg-sable-200",
  discret: "bg-transparent text-prune-700 hover:bg-sable-200 underline-offset-4",
  danger: "bg-rouge-fort text-white hover:bg-[#8a0e15]",
};

const TAILLES: Record<Taille, string> = {
  normal: "text-[0.95rem] py-2",
  grand: "text-base py-3 min-h-[3.25rem] w-full sm:w-auto",
};

export function Bouton({
  variante = "principal",
  taille = "normal",
  chargement = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  taille?: Taille;
  chargement?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      className={clsx(BASE, VARIANTES[variante], TAILLES[taille], className)}
    >
      {chargement ? <Rouet /> : null}
      {children}
    </button>
  );
}

export function BoutonLien({
  href,
  variante = "principal",
  taille = "normal",
  className,
  children,
}: {
  href: string;
  variante?: Variante;
  taille?: Taille;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(BASE, VARIANTES[variante], TAILLES[taille], className)}
    >
      {children}
    </Link>
  );
}

export function Rouet({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
