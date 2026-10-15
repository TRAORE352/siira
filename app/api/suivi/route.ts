// POST /api/suivi — le centre enregistre la suite donnée à une orientation :
// étape (reçue, examens réalisés, résultat disponible, absente), résultat et
// note. Met à jour le statut de l'orientation et crée une ligne dans suivis
// (exigence CE-07).
import { getUtilisateur, nonAutorise } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ETAPES_VERS_STATUT: Record<string, string> = {
  recue: "recue",
  examens: "examens",
  resultat: "resultat",
  absente: "absente",
};

const ETAPES = ["recue", "examens", "resultat", "absente"];
const RESULTATS = ["en_attente", "benin", "a_surveiller", "cancer_confirme"];

export async function POST(request: Request) {
  const utilisateur = await getUtilisateur();
  if (!utilisateur) return nonAutorise("Non connecté");
  if (utilisateur.role !== "centre") return nonAutorise();

  const corps = (await request.json().catch(() => null)) as {
    orientationId?: string;
    etape?: string;
    resultat?: string;
    note?: string;
  } | null;

  if (!corps?.orientationId || !corps.etape) {
    return Response.json(
      { error: "orientationId et etape sont obligatoires" },
      { status: 400 },
    );
  }
  if (!ETAPES.includes(corps.etape)) {
    return Response.json({ error: "Étape inconnue" }, { status: 400 });
  }
  if (!corps.resultat || !RESULTATS.includes(corps.resultat)) {
    return Response.json({ error: "Résultat inconnu" }, { status: 400 });
  }

  const supabase = await createClient();

  // La RLS ne renvoie l'orientation que si elle est adressée au centre connecté.
  const { data: orientation } = await supabase
    .from("orientations")
    .select("id, centre_id, statut")
    .eq("id", corps.orientationId)
    .single();

  if (!orientation) {
    return Response.json({ error: "Orientation introuvable" }, { status: 404 });
  }
  if (orientation.centre_id !== utilisateur.centreId) {
    return nonAutorise();
  }

  const admin = createAdminClient();
  const statut = ETAPES_VERS_STATUT[corps.etape];

  const { error: errSuivi } = await admin.from("suivis").insert({
    orientation_id: corps.orientationId,
    etape: corps.etape,
    resultat: corps.resultat,
    note: corps.note?.trim() ? corps.note.trim() : null,
    auteur_id: utilisateur.profilId,
  });
  if (errSuivi) {
    return Response.json({ error: errSuivi.message }, { status: 400 });
  }

  const { error: errOrientation } = await admin
    .from("orientations")
    .update({ statut })
    .eq("id", corps.orientationId);
  if (errOrientation) {
    return Response.json({ error: errOrientation.message }, { status: 400 });
  }

  return Response.json({ ok: true, statut });
}
