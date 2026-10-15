"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Deconnexion from "./deconnexion";

const NAV = [
  { href: "/centre", label: "Tableau de bord", exact: true },
  { href: "/centre/patientes", label: "Patientes" },
  { href: "/centre/suivi", label: "Suivi des soins" },
  { href: "/centre/prises-en-charge", label: "Prises en charge" },
  { href: "/centre/disponibilites", label: "Disponibilités" },
];

/** Barre latérale de l'espace centre. */
export default function BarreLaterale({ centreNom }: { centreNom: string }) {
  const pathname = usePathname();

  function estActif(href: string, exact = false) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-rose-bordure bg-white">
      <div className="px-6 py-6">
        <span className="text-lg font-bold text-rose-principal">Siira</span>
        <p className="mt-1 text-xs text-texte-secondaire">Espace centre</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const actif = estActif(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-bouton px-4 py-3 text-sm font-medium ${
                actif
                  ? "bg-rose-clair text-rose-fonce"
                  : "text-texte-principal hover:bg-rose-clair"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-rose-bordure px-3 py-4">
        <Link
          href="/centre/compte"
          className={`block rounded-bouton px-4 py-3 text-sm font-medium ${
            estActif("/centre/compte")
              ? "bg-rose-clair text-rose-fonce"
              : "text-texte-principal hover:bg-rose-clair"
          }`}
        >
          Compte
        </Link>
        <p className="px-4 py-2 text-xs text-texte-secondaire">{centreNom}</p>
        <Deconnexion />
      </div>
    </aside>
  );
}
