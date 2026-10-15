// POST /api/prise-en-charge — le centre enregistre l'issue d'une demande de
// financement de son centre : « accorder » (un partenaire a accepté la prise
// en charge) ou « refuser ». L'accord passe par la fonction transactionnelle
// confirmer_financement (décrémente le budget du partenaire, retire les
// autres demandes du même cas).
import { getUtilisateur, nonAutorise } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const utilisateur = await getUtilisateur();
  if (!utilisateur) return nonAutorise("Non connecté");
  if (utilisateur.role !== "centre") return nonAutorise();

  const corps = (await request.json().catch(() => null)) as {
    financementId?: string;
    action?: string;
    raisonRefus?: string;
  } | null;

  if (!corps?.financementId || !["accorder", "refuser"].includes(corps.action ?? "")) {
    return Response.json(
      { error: "financementId et action (accorder/refuser) sont obligatoires" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // La RLS ne renvoie le financement que s'il concerne une orientation du centre.
  const { data: financement } = await supabase
    .from("financements")
    .select("id, orientation_id, statut")
    .eq("id", corps.financementId)
    .single();

  if (!financement) {
    return Response.json({ error: "Demande introuvable" }, { status: 404 });
  }

  // Vérification d'appartenance côté serveur (la RLS filtre déjà, on revérifie).
  const { data: orientation } = await supabase
    .from("orientations")
    .select("centre_id")
    .eq("id", financement.orientation_id)
    .single();
  if (!orientation || orientation.centre_id !== utilisateur.centreId) {
    return nonAutorise();
  }

  const admin = createAdminClient();

  if (corps.action === "accorder") {
    const { error } = await admin.rpc("confirmer_financement", {
      p_financement_id: corps.financementId,
    });
    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ ok: true, statut: "confirmee" });
  }

  const { error } = await admin
    .from("financements")
    .update({
      statut: "refusee",
      raison_refus: corps.raisonRefus?.trim() ? corps.raisonRefus.trim() : null,
    })
    .eq("id", corps.financementId)
    .eq("statut", "proposee");
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true, statut: "refusee" });
}
