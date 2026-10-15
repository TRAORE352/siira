// Middleware Supabase : rafraîchit la session et applique la redirection par
// rôle (section 7.1 CO-02 : un agent qui tape /ong est renvoyé vers /agent).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROUTE_PAR_ROLE: Record<string, string> = {
  agent: "/agent",
  centre: "/centre",
  ong: "/ong",
  admin: "/admin",
};

const ESPACES_PROTEGES = ["/agent", "/centre", "/ong", "/admin"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const estProtege = ESPACES_PROTEGES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user) {
    // Non connecté : renvoyer vers la connexion, sauf sur les pages publiques.
    if (estProtege) {
      const url = request.nextUrl.clone();
      url.pathname = "/connexion";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Rôle de l'utilisateur connecté.
  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = profil?.role;
  const accueil = role ? ROUTE_PAR_ROLE[role] : null;

  // Sur /connexion connecté : renvoyer vers son espace.
  if (pathname === "/connexion" && accueil) {
    const url = request.nextUrl.clone();
    url.pathname = accueil;
    return NextResponse.redirect(url);
  }

  // Dans un espace protégé qui n'est pas le sien : rediriger.
  if (estProtege && accueil && !(pathname === accueil || pathname.startsWith(accueil + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = accueil;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
