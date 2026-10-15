// POST /api/disponibilites — le centre met à jour les examens qu'il propose et
// le nombre de places par semaine (exigence CE-08). Le matching en tient compte
// immédiatement (lecture des mêmes colonnes par lib/matching.ts).
import { getUtilisateur, nonAutorise } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EXAMENS_VALIDES = ["echographie", "mammographie", "biopsie"];

export async function POST(request: Request) {
  const utilisateur = await getUtilisateur();
  if (!utilisateur) return nonAutorise("Non connecté");
  if (utilisateur.role !== "centre" || !utilisateur.centreId) return nonAutorise();

  const corps = (await request.json().catch(() => null)) as {
    examens?: string[];
    placesSemaine?: number;
  } | null;

  if (!corps || !Array.isArray(corps.examens)) {
    return Response.json({ error: "examens (liste) est obligatoire" }, { status: 400 });
  }
  if (corps.examens.some((e) => !EXAMENS_VALIDES.includes(e))) {
    return Response.json({ error: "Examen inconnu" }, { status: 400 });
  }
  const placesSemaine = Math.floor(corps.placesSemaine ?? 0);
  if (Number.isNaN(placesSemaine) || placesSemaine < 0) {
    return Response.json({ error: "placesSemaine invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: centre } = await supabase
    .from("centres")
    .select("id")
    .eq("id", utilisateur.centreId)
    .single();
  if (!centre) return nonAutorise();

  const admin = createAdminClient();
  const { error } = await admin
    .from("centres")
    .update({ examens: corps.examens, places_semaine: placesSemaine })
    .eq("id", utilisateur.centreId);

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
