// POST /api/admin/reinitialiser — supprime les données de test (AD-02).
import { getUtilisateur, nonAutorise } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const utilisateur = await getUtilisateur();
  if (!utilisateur || utilisateur.role !== "admin") {
    return nonAutorise();
  }

  const admin = createAdminClient();

  // Ordre : enfants d'abord (contraintes de clés étrangères).
  const { error: e1 } = await admin.from("suivis").delete().not("id", "is", null);
  const { error: e2 } = await admin.from("financements").delete().not("id", "is", null);
  const { error: e3 } = await admin.from("orientations").delete().not("id", "is", null);
  const { error: e4 } = await admin.from("consultations").delete().not("id", "is", null);

  const erreur = e1 ?? e2 ?? e3 ?? e4;
  if (erreur) {
    return Response.json({ error: erreur.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
