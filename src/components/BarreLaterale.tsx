"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Logo } from "./Logo";
import { trouverCentre } from "@/lib/data";
import type { LienNav } from "@/lib/nav";
import { ACCUEIL_PAR_ROLE, fermerSession } from "@/lib/session";
import type { Profil } from "@/lib/types";

/**
 * Barre latérale de l'espace centre : les rubriques en haut, le compte et la
 * déconnexion en bas.
 */
export function BarreLaterale({
  profil,
  liens = [],
}: {
  profil: Profil;
  liens?: LienNav[];
}) {
  const chemin = usePathname();
  const router = useRouter();
  const accueil = ACCUEIL_PAR_ROLE[profil.role];
  const centre = profil.centre_id ? trouverCentre(profil.centre_id) : undefined;
  const equipe = profil.role === "admin";

  function estActif(href: string): boolean {
    // L'accueil de l'espace n'est actif que sur sa page exacte : sinon il
    // serait marqué sur toutes les rubriques qui commencent par le même chemin.
    if (href === accueil) return chemin === accueil;
    return chemin === href || chemin.startsWith(`${href}/`);
  }

  function deconnecter() {
    fermerSession();
    router.replace("/connexion");
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sable-200 bg-white">
      <div className="px-5 py-5">
        <Logo taille="petit" href={accueil} />
        <p className="mt-2 text-xs text-sable-600">
          {equipe ? "Espace équipe Siira" : "Espace centre spécialisé"}
        </p>
      </div>

      <nav aria-label="Rubriques" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {liens.map((l) => {
          const actif = estActif(l.href);
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

      <div className="border-t border-sable-200 px-3 py-4">
        {equipe ? null : (
          <Link
            href="/centre/compte"
            aria-current={chemin === "/centre/compte" ? "page" : undefined}
            className={clsx(
              "flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] px-3 text-[0.95rem] transition-colors",
              chemin === "/centre/compte"
                ? "bg-rose-50 font-medium text-rose-700"
                : "text-prune-700 hover:bg-sable-200",
            )}
          >
            Compte
          </Link>
        )}
        <p className="px-3 py-2 text-sm text-prune-800">
          {profil.nom}
          {centre ? (
            <span className="block text-xs text-sable-600">{centre.nom}</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={deconnecter}
          className="flex min-h-[var(--spacing-cible)] w-full items-center rounded-[var(--radius-moyen)] px-3 text-left text-[0.95rem] text-prune-700 hover:bg-sable-200"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
