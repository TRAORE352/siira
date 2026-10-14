import { clsx } from "clsx";
import type { Niveau } from "@/lib/types";

const STYLE: Record<Niveau, { boite: string; pastille: string; mot: string }> = {
  vert: {
    boite: "bg-vert-bg border-vert-bord text-vert-texte",
    pastille: "bg-vert-fort",
    mot: "Vert",
  },
  orange: {
    boite: "bg-orange-bg border-orange-bord text-orange-texte",
    pastille: "bg-orange-fort",
    mot: "Orange",
  },
  rouge: {
    boite: "bg-rouge-bg border-rouge-bord text-rouge-texte",
    pastille: "bg-rouge-fort",
    mot: "Rouge",
  },
};

/**
 * Etiquette de niveau d'urgence.
 * La couleur n'est jamais seule : le mot est toujours ecrit a cote.
 */
export function BadgeNiveau({
  niveau,
  taille = "normal",
  className,
}: {
  niveau: Niveau;
  taille?: "petit" | "normal" | "grand";
  className?: string;
}) {
  const s = STYLE[niveau];
  const dim = {
    petit: "text-xs px-2 py-0.5 gap-1.5",
    normal: "text-sm px-2.5 py-1 gap-2",
    grand: "text-base px-3.5 py-1.5 gap-2.5 font-medium",
  }[taille];
  const pastille = {
    petit: "h-2 w-2",
    normal: "h-2.5 w-2.5",
    grand: "h-3 w-3",
  }[taille];

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        s.boite,
        dim,
        className,
      )}
    >
      <span className={clsx("rounded-full", s.pastille, pastille)} aria-hidden="true" />
      {s.mot}
    </span>
  );
}

/** Grand bandeau de resultat, en haut de l'ecran de classement. */
export function BandeauNiveau({
  niveau,
  delai,
  children,
}: {
  niveau: Niveau;
  delai: string;
  children?: React.ReactNode;
}) {
  const s = STYLE[niveau];
  return (
    <section
      aria-labelledby="titre-niveau"
      className={clsx("rounded-[var(--radius-grand)] border p-5 sm:p-6", s.boite)}
    >
      <p className="text-sm font-medium uppercase tracking-wide opacity-80">
        Niveau d&apos;urgence proposé
      </p>
      <h2 id="titre-niveau" className="mt-1 flex items-center gap-3 text-3xl sm:text-4xl">
        <span className={clsx("h-4 w-4 rounded-full", s.pastille)} aria-hidden="true" />
        {s.mot}
      </h2>
      <p className="mt-2 text-lg font-medium">{delai}</p>
      {children}
    </section>
  );
}

export const MOT_NIVEAU: Record<Niveau, string> = {
  vert: "Vert",
  orange: "Orange",
  rouge: "Rouge",
};
