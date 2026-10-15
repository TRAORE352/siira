import Deconnexion from "@/components/deconnexion";
import { getContexteCentre, getCentreInfo } from "@/lib/centre";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const contexte = await getContexteCentre();
  if (!contexte || !contexte.centreId) return null;

  const centre = await getCentreInfo(contexte.centreId);

  const supabase = await createClient();
  const { data: profil } = await supabase
    .from("profils")
    .select("nom, role")
    .eq("id", contexte.profilId)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-texte-principal">Compte</h1>

      <div className="max-w-md rounded-carte border border-rose-bordure bg-white p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-texte-secondaire">
              Nom
            </dt>
            <dd className="mt-1 text-sm font-medium text-texte-principal">{profil?.nom ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-texte-secondaire">
              Rôle
            </dt>
            <dd className="mt-1 text-sm text-texte-principal">Centre spécialisé</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-texte-secondaire">
              Centre de rattachement
            </dt>
            <dd className="mt-1 text-sm text-texte-principal">
              {centre?.nom ?? "—"}
              {centre?.service ? ` — ${centre.service}` : ""}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-rose-bordure pt-4">
          <Deconnexion />
        </div>
      </div>
    </div>
  );
}
