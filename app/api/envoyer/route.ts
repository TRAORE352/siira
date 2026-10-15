// POST /api/envoyer — passage de l'orientation à "envoyee", décompte de la place,
// génération du résumé IA pour le spécialiste.
import { getUtilisateur, nonAutorise } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resumeSpecialiste } from "@/lib/deepseek";

export async function POST(request: Request) {
  const utilisateur = await getUtilisateur();
  if (!utilisateur) return nonAutorise("Non connecté");
  if (utilisateur.role !== "agent" && utilisateur.role !== "admin") {
    return nonAutorise();
  }

  const { orientationId } = await request.json();
  if (!orientationId) {
    return Response.json({ error: "orientationId manquant" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: orientation } = await supabase
    .from("orientations")
    .select("id, consultation_id, creneau_id, statut")
    .eq("id", orientationId)
    .single();
  if (!orientation) {
    return Response.json({ error: "Orientation introuvable" }, { status: 404 });
  }

  const { data: consultation } = await supabase
    .from("consultations")
    .select("agent_id, fiche, niveau_valide")
    .eq("id", orientation.consultation_id)
    .single();
  if (utilisateur.role === "agent" && consultation?.agent_id !== utilisateur.profilId) {
    return nonAutorise();
  }

  let resume: string | null = null;
  if (consultation?.fiche) {
    try {
      resume = await resumeSpecialiste(
        consultation.fiche,
        (consultation.niveau_valide as "vert" | "orange" | "rouge") ?? "orange",
      );
    } catch {
      resume = null;
    }
  }

  await supabase
    .from("orientations")
    .update({ statut: "envoyee", envoyee_le: new Date().toISOString(), resume_ia: resume })
    .eq("id", orientationId);

  // Décompte de la place (action système, via service_role : l'agent n'a pas
  // le droit de modifier les créneaux).
  if (orientation.creneau_id) {
    const admin = createAdminClient();
    await admin.from("creneaux").update({ libre: false }).eq("id", orientation.creneau_id);
  }

  return Response.json({ ok: true, statut: "envoyee", resume });
}
