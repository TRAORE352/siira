"use client";

import Image from "next/image";
import Link from "next/link";
import { Installation } from "@/components/Installation";
import { Logo } from "@/components/Logo";
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
  if (ESPACE_ACTIF === "agent") return <AccueilAgent />;
  return <AccueilGeneral />;
}

/* ------------------------------------------------------------------ */
/* Agent : écran d'entrée plein écran, sur le téléphone                 */
/* ------------------------------------------------------------------ */

/** Les trois temps du travail de l'agent, dans l'ordre où il les vit. */
const ETAPES = [
  {
    numero: "1",
    titre: "Dépister",
    texte: "Enregistrez la patiente et dictez ce qu’elle ressent.",
  },
  {
    numero: "2",
    titre: "Orienter",
    texte: "Siira évalue l’urgence et propose un centre et un rendez-vous.",
  },
  {
    numero: "3",
    titre: "Suivre",
    texte: "Vous savez si elle a été reçue, et si les soins sont financés.",
  },
];

function AccueilAgent() {
  return (
    <div className="fond-marque flex min-h-screen flex-col">
      <main
        id="contenu"
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-12 pb-10 sm:pt-16"
      >
        <Image
          src="/brand/icon-512.png"
          alt=""
          width={60}
          height={60}
          priority
          className="rounded-[1.15rem] bg-white/95 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
          style={{ width: 60, height: 60 }}
        />

        <p className="mt-7 text-xs font-medium tracking-[0.14em] text-rose-200/80 uppercase">
          {mentionEspace(ESPACE_ACTIF)}
        </p>

        <h1 className="mt-2.5 font-[family-name:var(--font-titre)] text-[2.4rem] leading-[1.1] text-white">
          Le chemin
          <br />
          vers les soins
        </h1>

        <p className="mt-4 text-[1.05rem] leading-relaxed text-rose-100/80">
          Du premier doute d’une femme jusqu’à sa prise en charge par un
          spécialiste. Depuis votre téléphone, même sans bon réseau.
        </p>

        {/* Les trois temps du parcours : ce que l'agent va réellement faire. */}
        <ol className="mt-9 flex flex-col gap-3">
          {ETAPES.map((e) => (
            <li
              key={e.numero}
              className="flex items-start gap-3.5 rounded-[var(--radius-grand)] border border-white/12 bg-white/7 p-4"
            >
              <span
                aria-hidden="true"
                className="chiffres-fixes flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-sm font-semibold text-white"
              >
                {e.numero}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-white">{e.titre}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-rose-100/70">
                  {e.texte}
                </span>
              </span>
            </li>
          ))}
        </ol>

        {/* L'action occupe le bas de l'écran, à portée du pouce. */}
        <div className="mt-auto pt-10">
          <Link
            href="/connexion"
            className="pression flex min-h-[3.5rem] w-full items-center justify-center rounded-[var(--radius-moyen)] bg-rose-600 px-5 text-[1.05rem] font-medium text-white shadow-[var(--shadow-action)] hover:bg-rose-700"
          >
            Ouvrir mon espace
          </Link>

          <p className="mt-5 text-center text-xs leading-relaxed text-rose-100/55">
            Siira ne pose pas de diagnostic. Il évalue un niveau d’urgence et
            oriente vers un centre spécialisé.
          </p>

          {/*
            L'invitation d'installation n'apparaît que si le navigateur la
            propose réellement. Sa carte est blanche : elle ressort d'elle-même
            sur le fond sombre, sans encadrement supplémentaire qui resterait
            visible quand elle ne s'affiche pas.
          */}
          <Installation />
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Centre, ONG, application complète : écran d'ordinateur               */
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
