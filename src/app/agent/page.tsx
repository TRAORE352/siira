"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Espace } from "@/components/Espace";
import { Installation } from "@/components/Installation";
import { Marque } from "@/components/Logo";
import { listerPatientesAgent } from "@/lib/data";
import type { PatienteEnListe } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { fermerSession, useSession } from "@/lib/session";

/**
 * Accueil de l'agent.
 *
 * Après la connexion, l'agent doit voir une page qui lui dit quoi faire, pas
 * une liste à déchiffrer : trois grandes zones d'appui, un mot chacune.
 * L'application n'a que deux chemins (enregistrer un cas, retrouver une
 * patiente) et une invitation (installer l'application) ; l'accueil les montre
 * tous les trois, et rien d'autre.
 */
export default function AccueilAgent() {
  return (
    <Espace role="agent" entete="aucun">
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const agentId = profil?.id ?? "";
  const { donnees, pret } = useDonnees<PatienteEnListe[]>(() =>
    agentId ? listerPatientesAgent(agentId) : [],
  );

  const liste = donnees ?? [];
  const aRevoir = liste.filter((d) => d.absente).length;

  return (
    <>
      <EnTeteAgent nom={profil?.nom ?? ""} centre={profil?.centre_sante ?? null} />

      <main id="contenu" className="feuille relative -mt-6 flex flex-1 flex-col px-4 pt-8 pb-12 sm:px-6">
        {/*
          Le bloc est centré verticalement : deux options dans une feuille de
          800 px laisseraient un grand vide sous le bouton, qui se lirait comme
          un écran inachevé.
        */}
        <div className="mx-auto my-auto flex w-full max-w-2xl flex-col gap-3">
          <Option
            principale
            href="/agent/consultation/nouvelle"
            libelle="Nouvelle consultation"
          />

          <Option
            href="/agent/patientes"
            libelle="Mes patientes"
            detail={
              pret
                ? `${liste.length} patiente${liste.length > 1 ? "s" : ""}`
                : null
            }
            alerte={aRevoir > 0 ? `${aRevoir} à revoir` : null}
          />

          {/* N'apparaît que si le navigateur propose vraiment l'installation. */}
          <Installation />
        </div>
      </main>
    </>
  );
}

/*
 * En-tête : marque, salutation. Rien d'autre.
 *
 * Le numéro de téléphone et trois compteurs y ont vécu : le numéro ne sert à
 * rien (l'agent sait avec lequel il s'est connecté) et les nombres comptaient
 * ce que la liste montrait déjà. Ce qu'il reste à savoir est maintenant porté
 * par l'option « Mes patientes », là où cela sert à décider.
 */
function EnTeteAgent({ nom, centre }: { nom: string; centre: string | null }) {
  const router = useRouter();
  /* « Salimata Ouédraogo » → « Salimata » : on salue par le prénom. */
  const prenom = nom.split(" ")[0] ?? "";

  return (
    <header className="fond-marque px-4 pt-6 pb-12 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-white/95 p-1">
              <Marque taille={32} />
            </span>
            <span className="text-[0.95rem] font-medium text-white">
              {centre ?? "Agent de santé"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              fermerSession();
              router.replace("/connexion");
            }}
            className="pression flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border border-white/20 bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/15"
          >
            Quitter
          </button>
        </div>

        <p className="mt-7 text-sm text-rose-100/75">{salutation()}</p>
        <h1 className="mt-0.5 font-[family-name:var(--font-titre)] text-[1.9rem] leading-tight text-white">
          {prenom || "Bienvenue"}
        </h1>
      </div>
    </header>
  );
}

function salutation(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

/**
 * Une option de l'accueil : une grande zone d'appui, un mot, et à droite ce
 * qu'on y trouve. La hauteur de 80 px se touche sans regarder, même avec le
 * pouce, même en marchant.
 */
function Option({
  href,
  libelle,
  detail,
  alerte,
  principale = false,
}: {
  href: string;
  libelle: string;
  /** Ce qu'on trouve derrière : un nombre, par exemple. */
  detail?: string | null;
  /** Ce qui presse, dit en deux mots et en rouge. */
  alerte?: string | null;
  principale?: boolean;
}) {
  if (principale) {
    return (
      <Link
        href={href}
        className="pression flex min-h-[5rem] items-center justify-center gap-2 rounded-[var(--radius-grand)] bg-rose-600 px-5 text-[1.05rem] font-medium text-white shadow-[var(--shadow-action)] hover:bg-rose-700"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          +
        </span>
        {libelle}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="pression flex min-h-[5rem] items-center justify-between gap-3 rounded-[var(--radius-grand)] border border-sable-200 bg-white px-5 shadow-[var(--shadow-carte)] hover:border-sable-300 hover:bg-sable-50"
    >
      <span className="min-w-0 text-[1.05rem] font-medium text-prune-900">{libelle}</span>

      <span className="flex shrink-0 items-baseline gap-2 text-sm">
        {detail ? (
          <span className="chiffres-fixes text-sable-600">{detail}</span>
        ) : null}
        {alerte ? (
          <span className="font-medium text-rouge-texte">{alerte}</span>
        ) : null}
        <span aria-hidden="true" className="text-prune-600">
          &rarr;
        </span>
      </span>
    </Link>
  );
}
