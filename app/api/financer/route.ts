// POST /api/financer — l'ONG confirme une demande : appel de la fonction
// confirmer_financement (transaction) qui met à jour budget et statuts.
import { getUtilisateur, nonAutorise } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const utilisateur = await getUtilisateur();
  if (!utilisateur) return nonAutorise("Non connecté");
  if (utilisateur.role !== "ong" && utilisateur.role !== "admin") {
    return nonAutorise();
  }

  const { financementId } = await request.json();
  if (!financementId) {
    return Response.json({ error: "financementId manquant" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: financement } = await supabase
    .from("financements")
    .select("id, ong_id, statut")
    .eq("id", financementId)
    .single();

  if (!financement) {
    return Response.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (utilisateur.role === "ong" && financement.ong_id !== utilisateur.ongId) {
    return nonAutorise();
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("confirmer_financement", {
    p_financement_id: financementId,
  });
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true, statut: "confirmee" });
}
