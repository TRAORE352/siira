import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Carte({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={clsx(
        "rounded-[var(--radius-grand)] border border-sable-200 bg-white p-5 shadow-[var(--shadow-carte)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Titre d'une section d'écran.
 * `principal` en fait le titre de la page (un seul par écran).
 */
export function TitreSection({
  children,
  aide,
  action,
  principal = true,
}: {
  children: ReactNode;
  aide?: string;
  action?: ReactNode;
  principal?: boolean;
}) {
  const Titre = principal ? "h1" : "h2";
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <Titre
          className={principal ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}
        >
          {children}
        </Titre>
        {aide ? <p className="mt-1 text-sm text-sable-600">{aide}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Etat vide : explique ce qui manque et ce qu'on peut faire. */
export function EtatVide({
  titre,
  texte,
  action,
}: {
  titre: string;
  texte: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-grand)] border border-dashed border-sable-300 bg-white/60 px-6 py-12 text-center">
      <p className="text-lg font-medium text-prune-800">{titre}</p>
      <p className="mx-auto mt-2 max-w-md text-sable-600">{texte}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Message d'erreur en francais, sans code technique. */
export function MessageErreur({
  titre = "Quelque chose n'a pas fonctionne",
  texte,
  action,
  className,
}: {
  titre?: string;
  texte: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-[var(--radius-moyen)] border border-rouge-bord bg-rouge-bg p-4",
        className,
      )}
    >
      <p className="font-medium text-rouge-texte">{titre}</p>
      <p className="mt-1 text-[0.95rem] text-rouge-texte/90">{texte}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function MessageInfo({
  titre,
  children,
}: {
  titre?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-moyen)] border border-info-bord bg-info-bg p-4">
      {titre ? <p className="font-medium text-info-fort">{titre}</p> : null}
      <div className="text-[0.95rem] text-prune-800">{children}</div>
    </div>
  );
}

export function MessageSucces({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-[var(--radius-moyen)] border border-vert-bord bg-vert-bg p-4 text-[0.95rem] text-vert-texte"
    >
      {children}
    </div>
  );
}

/** Mention obligatoire, presente sur chaque ecran de resultat. */
export function MentionPasDeDiagnostic({ className }: { className?: string }) {
  return (
    <p
      className={clsx(
        "rounded-[var(--radius-moyen)] border border-sable-300 bg-sable-100 px-4 py-3 text-sm text-prune-700",
        className,
      )}
    >
      Cet outil ne pose pas de diagnostic. Il évalue un niveau d&apos;urgence.
    </p>
  );
}

/** Barre de chargement en forme de contenu, pour les listes. */
export function Squelette({ lignes = 3 }: { lignes?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: lignes }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-[var(--radius-grand)] border border-sable-200 bg-sable-100"
        />
      ))}
    </div>
  );
}

export function Chargement({ texte = "Chargement" }: { texte?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sable-600">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
      {texte}
    </p>
  );
}

/** Couple libelle / valeur, pour les fiches en lecture. */
export function Ligne({
  libelle,
  children,
}: {
  libelle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sable-200 py-2.5 last:border-0">
      <dt className="text-sm text-sable-600">{libelle}</dt>
      <dd className="text-right text-[0.95rem] font-medium text-prune-900">{children}</dd>
    </div>
  );
}
