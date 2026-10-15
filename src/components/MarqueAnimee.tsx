import Image from "next/image";
import { clsx } from "clsx";

/**
 * Marque de Siira, animée.
 *
 * Le symbole représente deux silhouettes côte à côte : une femme et celle qui
 * l'accompagne. L'animation raconte cela, et rien d'autre — un anneau se trace
 * autour d'elles comme le chemin qu'elles parcourent, puis le symbole se pose.
 * Aucun rebond, aucune rotation : ce produit accompagne des femmes malades, le
 * mouvement doit être calme.
 *
 * Tout est en CSS. Le composant est rendu par le serveur et ne dépend ni de
 * React ni d'un minuteur : il s'anime même pendant que la page finit de
 * charger, ce qui est précisément le moment où on le regarde.
 */
export function MarqueAnimee({
  taille = 76,
  className,
}: {
  /** Côté du symbole en pixels. L'anneau se dimensionne autour. */
  taille?: number;
  className?: string;
}) {
  /*
   * L'anneau doit dégager les COINS du symbole, pas ses côtés : un carré de
   * côté c a une diagonale de c * 1,414, donc ses angles sont à 0,707 c du
   * centre. Avec ce facteur, le trait passe nettement au large — sinon il
   * semble traverser le symbole au lieu de l'entourer.
   */
  const anneau = Math.round(taille * 2.15);
  const rayon = 46;
  const perimetre = 2 * Math.PI * rayon;

  return (
    <span
      className={clsx("marque-animee relative inline-flex items-center justify-center", className)}
      style={{ width: anneau, height: anneau }}
    >
      {/*
        Le chemin. Tracé une fois, en rose, d'un seul trait continu : c'est le
        sens du nom « Siira » en dioula. `aria-hidden` car purement décoratif —
        le nom du produit est écrit juste à côté, en texte.
      */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="marque-anneau absolute inset-0 h-full w-full"
        style={{ ["--perimetre" as string]: perimetre }}
      >
        <circle
          cx="50"
          cy="50"
          r={rayon}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={perimetre}
          strokeDashoffset={perimetre}
        />
      </svg>

      <Image
        src="/brand/icon-512.png"
        alt=""
        width={taille}
        height={taille}
        priority
        className="marque-symbole rounded-[22%] bg-white/95 p-[7%] shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
        style={{ width: taille, height: taille }}
      />
    </span>
  );
}
