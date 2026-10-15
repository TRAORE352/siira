import BarreLaterale from "@/components/barre-laterale";
import { getContexteCentre, getCentreInfo, supabaseConfigure } from "@/lib/centre";

export default async function Layout(props: LayoutProps<"/centre">) {
  const contexte = await getContexteCentre();

  if (!contexte || !contexte.centreId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-carte border border-rose-bordure bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-texte-principal">Espace centre</h1>
          <p className="mt-2 text-sm text-texte-secondaire">
            {supabaseConfigure()
              ? "Connectez-vous avec un compte « centre » pour accéder à cet espace."
              : "Supabase n'est pas configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local."}
          </p>
        </div>
      </div>
    );
  }

  const centre = await getCentreInfo(contexte.centreId);

  return (
    <div className="flex min-h-screen bg-fond">
      <BarreLaterale centreNom={centre?.nom ?? "Centre"} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{props.children}</main>
    </div>
  );
}
