"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Écran d'ouverture.
 *
 * Il couvre le temps réel de démarrage de l'application — polices, feuille de
 * style, premier rendu — plutôt que de laisser l'agent devant un écran blanc.
 * Il ne s'affiche qu'une fois par session : le revoir à chaque navigation
 * serait une perte de temps, pas une signature.
 *
 * Deux règles tenues :
 * - il se retire **tout seul**, sans jamais attendre une action ;
 * - il ne s'affiche pas du tout si la personne a demandé moins d'animations,
 *   ou si l'application a déjà démarré dans cette session.
 */

const CLE = "siira.ouverture.v1";
const DUREE_VISIBLE = 1150;
const DUREE_SORTIE = 450;

/*
 * Faut-il ouvrir le rideau ? La question se pose au navigateur, pas à React :
 * on la lit donc par `useSyncExternalStore`, qui donne une valeur stable dès le
 * premier rendu navigateur. Le rendu du serveur répond « non » — il ne connaît
 * ni le stockage de session ni les préférences d'animation — ce qui évite tout
 * écart d'hydratation sans passer par un effet qui appelle setState.
 */
function souscrire() {
  /* La réponse ne change jamais pendant la vie de la page. */
  return () => {};
}

function lireNavigateur(): boolean {
  if (window.sessionStorage.getItem(CLE) === "1") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.sessionStorage.setItem(CLE, "1");
    return false;
  }
  window.sessionStorage.setItem(CLE, "1");
  return true;
}

function lireServeur(): boolean {
  return false;
}

export function Ouverture() {
  const aOuvrir = useSyncExternalStore(souscrire, lireNavigateur, lireServeur);
  const [phase, setPhase] = useState<"visible" | "sortie" | "fini">("visible");

  useEffect(() => {
    if (!aOuvrir) return;

    const versSortie = window.setTimeout(() => setPhase("sortie"), DUREE_VISIBLE);
    const versFin = window.setTimeout(
      () => setPhase("fini"),
      DUREE_VISIBLE + DUREE_SORTIE,
    );

    return () => {
      window.clearTimeout(versSortie);
      window.clearTimeout(versFin);
    };
  }, [aOuvrir]);

  if (!aOuvrir || phase === "fini") return null;

  return (
    <div
      /*
       * `aria-hidden` : l'écran d'ouverture est purement visuel. Un lecteur
       * d'écran doit lire la page, pas ce rideau. Il ne piège pas le focus et
       * laisse passer les clics dès la sortie entamée.
       */
      aria-hidden="true"
      className={`fond-marque fixed inset-0 z-50 flex flex-col items-center justify-center ${
        phase === "sortie" ? "splash-sortie pointer-events-none" : ""
      }`}
    >
      {/* Halo qui s'ouvre derrière la marque. */}
      <span className="splash-halo pointer-events-none absolute h-72 w-72 rounded-full bg-rose-500/40 blur-3xl" />

      <div className="splash-marque relative flex flex-col items-center">
        <Image
          src="/brand/icon-512.png"
          alt=""
          width={76}
          height={76}
          priority
          className="rounded-[1.4rem] bg-white/95 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
          style={{ width: 76, height: 76 }}
        />

        <p className="mt-5 font-[family-name:var(--font-titre)] text-3xl text-white">
          Siira
        </p>

        {/* Le trait se trace : c'est « le chemin », le sens du nom en dioula. */}
        <span className="splash-trait mt-3 block h-[2px] w-24 rounded-full bg-rose-400" />

        <p className="mt-4 text-sm text-rose-100/70">Le chemin vers les soins</p>
      </div>
    </div>
  );
}
