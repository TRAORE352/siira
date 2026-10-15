import DisponibilitesForm from "@/components/disponibilites-form";
import { getContexteCentre, getCentreInfo } from "@/lib/centre";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const contexte = await getContexteCentre();
  if (!contexte || !contexte.centreId) return null;

  const centre = await getCentreInfo(contexte.centreId);
  if (!centre) {
    return <p className="text-sm text-texte-secondaire">Centre introuvable.</p>;
  }

  const supabase = await createClient();
  const maintenant = new Date();
  const dans7Jours = new Date(maintenant.getTime() + 7 * 24 * 3600 * 1000);
  const { count } = await supabase
    .from("creneaux")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", contexte.centreId)
    .eq("libre", true)
    .gte("debut", maintenant.toISOString())
    .lte("debut", dans7Jours.toISOString());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-texte-principal">Disponibilités</h1>
        <p className="text-sm text-texte-secondaire">
          Les examens proposés et les places disponibles. Ces informations sont prises en compte
          immédiatement par le calcul d&apos;orientation.
        </p>
      </div>
      <div className="max-w-xl rounded-carte border border-rose-bordure bg-white p-6">
        <DisponibilitesForm centre={centre} placesLibres={count ?? 0} />
      </div>
    </div>
  );
}
