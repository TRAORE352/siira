import Image from "next/image";
import Link from "next/link";

/**
 * Logo Siira.
 *
 * Le fichier fourni par l'equipe est utilise tel quel. Le mot-symbole porte
 * les deux "ii" en rose et les lettres S, r, a en prune.
 */
export function Logo({
  taille = "moyen",
  lien = true,
  href = "/",
}: {
  taille?: "petit" | "moyen" | "grand";
  lien?: boolean;
  href?: string;
}) {
  const dimensions = {
    petit: { w: 92, h: 39 },
    moyen: { w: 124, h: 52 },
    grand: { w: 190, h: 80 },
  }[taille];

  const image = (
    <Image
      src="/brand/siira-logo.png"
      alt="Siira"
      width={dimensions.w}
      height={dimensions.h}
      priority
      // Les deux dimensions sont laissées à "auto" : le rapport est conservé
      // par Next à partir de width et height ci-dessus.
      style={{ width: dimensions.w, height: "auto", maxWidth: "100%" }}
      sizes={`${dimensions.w}px`}
    />
  );

  if (!lien) return image;

  return (
    <Link
      href={href}
      className="inline-flex min-h-[var(--spacing-cible)] items-center"
      aria-label="Siira, accueil"
    >
      {image}
    </Link>
  );
}

/** Marque carree, pour les en-tetes compacts et les espaces sombres. */
export function Marque({ taille = 36 }: { taille?: number }) {
  return (
    <Image
      src="/brand/icon-512.png"
      alt=""
      width={taille}
      height={taille}
      style={{ width: taille, height: taille }}
    />
  );
}
