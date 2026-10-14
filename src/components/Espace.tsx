"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import { Logo } from "./Logo";
import { Chargement } from "./Interface";
import { ACCUEIL_PAR_ROLE, LIBELLE_ROLE, fermerSession, useSession } from "@/lib/session";
import type { Role } from "@/lib/types";

export type { LienNav } from "@/lib/nav";
import type { LienNav } from "@/lib/nav";

/**
 * Coquille commune aux espaces protégés.
 *
 * Renvoie vers la connexion si personne n'est connecté, et vers son propre
 * espace si le rôle ne correspond pas à la page demandée.
 */
export function Espace({
  role,
  liens,
  children,
  large = false,
}: {
  role: Role;
  liens?: LienNav[];
  children: ReactNode;
  /** Vrai pour les écrans d'ordinateur (centre, ONG). */
  large?: boolean;
}) {
  const { profil, pret } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!pret) return;
    if (!profil) {
      router.replace("/connexion");
    } else if (profil.role !== role) {
      router.replace(ACCUEIL_PAR_ROLE[profil.role]);
    }
  }, [pret, profil, role, router]);

  if (!pret || !profil || profil.role !== role) {
    return (
      <main id="contenu" className="flex min-h-screen items-center justify-center p-6">
        <Chargement texte="Ouverture de votre espace" />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <EnTete profil={profil} liens={liens} large={large} />
      <main
        id="contenu"
        className={clsx(
          "mx-auto w-full flex-1 px-4 py-6 sm:px-6",
          large ? "max-w-6xl" : "max-w-2xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}

function EnTete({
  profil,
  liens,
  large,
}: {
  profil: { nom: string; role: Role; centre_sante: string | null };
  liens?: LienNav[];
  large: boolean;
}) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const router = useRouter();

  function deconnecter() {
    fermerSession();
    router.replace("/connexion");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-sable-200 bg-sable-50/95 backdrop-blur">
      <div
        className={clsx(
          "mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6",
          large ? "max-w-6xl" : "max-w-2xl",
        )}
      >
        <div className="flex items-center gap-3">
          <Logo taille="petit" href={ACCUEIL_PAR_ROLE[profil.role]} />
          <span className="hidden text-sm text-sable-600 sm:inline">
            {profil.centre_sante ?? LIBELLE_ROLE[profil.role]}
          </span>
        </div>

        {/* Navigation d'ordinateur */}
        {liens && liens.length > 0 ? (
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {liens.map((l) => {
              const actif = chemin === l.href || chemin.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={actif ? "page" : undefined}
                  className={clsx(
                    "flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] px-3 text-[0.95rem] transition-colors",
                    actif
                      ? "bg-rose-50 font-medium text-rose-700"
                      : "text-prune-700 hover:bg-sable-200",
                  )}
                >
                  {l.libelle}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          <span className="hidden text-sm font-medium text-prune-800 lg:inline">
            {profil.nom}
          </span>
          <button
            type="button"
            onClick={deconnecter}
            className="flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border border-sable-300 bg-white px-3 text-[0.95rem] text-prune-800 transition-colors hover:bg-sable-100"
          >
            Se déconnecter
          </button>
          {liens && liens.length > 0 ? (
            <button
              type="button"
              onClick={() => setOuvert((o) => !o)}
              aria-expanded={ouvert}
              aria-controls="menu-sections"
              className="flex min-h-[var(--spacing-cible)] min-w-[var(--spacing-cible)] items-center justify-center rounded-[var(--radius-moyen)] border border-sable-300 bg-white md:hidden"
            >
              <span className="lecteur-seul">Afficher les sections</span>
              <span aria-hidden="true" className="flex flex-col gap-[3px]">
                <span className="block h-[2px] w-4 bg-prune-800" />
                <span className="block h-[2px] w-4 bg-prune-800" />
                <span className="block h-[2px] w-4 bg-prune-800" />
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Navigation repliable, téléphone */}
      {liens && liens.length > 0 && ouvert ? (
        <nav
          id="menu-sections"
          aria-label="Sections"
          className="border-t border-sable-200 bg-white px-4 py-2 md:hidden"
        >
          {liens.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOuvert(false)}
              className="flex min-h-[var(--spacing-cible)] items-center border-b border-sable-100 text-[0.95rem] text-prune-800 last:border-0"
            >
              {l.libelle}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

/**
 * Barre d'actions fixée en bas de l'écran, à portée du pouce.
 * Utilisée sur les écrans de l'agent.
 */
export function BarreAction({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Réserve la place sous le contenu pour que rien ne soit masqué. */}
      <div aria-hidden="true" className="h-24" />
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sable-200 bg-white/95 shadow-[var(--shadow-barre)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          {children}
        </div>
      </div>
    </>
  );
}

/** Fil d'Ariane discret, pour revenir en arrière sans perdre le contexte. */
export function Retour({ href, libelle }: { href: string; libelle: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex min-h-[var(--spacing-cible)] items-center gap-1.5 text-[0.95rem] text-prune-700 hover:text-rose-700"
    >
      <span aria-hidden="true">&larr;</span>
      {libelle}
    </Link>
  );
}
