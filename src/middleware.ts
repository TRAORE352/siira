import { NextResponse, type NextRequest } from "next/server";
import { ESPACE_ACTIF, cheminAutorise, cheminRefus } from "@/lib/espaces";

/**
 * Une adresse, un espace.
 *
 * Sur une adresse dédiée (agent, centre, ONG), les écrans des autres espaces ne
 * sont pas seulement retirés de la navigation : ils sont refusés avant tout
 * rendu. Le navigateur ne reçoit donc jamais le contenu d'un autre espace, même
 * en tapant l'adresse à la main.
 *
 * Sur l'application complète, aucun filtrage : c'est l'adresse de démonstration.
 */
export function middleware(requete: NextRequest) {
  const { pathname } = requete.nextUrl;
  if (cheminAutorise(ESPACE_ACTIF, pathname)) return NextResponse.next();

  const url = requete.nextUrl.clone();
  url.pathname = cheminRefus(ESPACE_ACTIF);
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  /*
   * Les fichiers servis tels quels (icônes, service worker, manifeste, images)
   * ne passent pas par ici : seul le contenu des écrans est filtré.
   */
  matcher: [
    "/((?!_next/static|_next/image|brand/|sw\\.js|manifest\\.webmanifest|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|txt|xml|webmanifest|json)$).*)",
  ],
};
