// POST /api/analyser — extraction DeepSeek + classement par règles + explication.
import { getUtilisateur, nonAutorise } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { anonymiserRecit, explicationNiveau, extractionFiche } from "@/lib/deepseek";
import { trouverCasDemo } from "@/lib/cache-demo";
import { classer } from "@/lib/regles";

export async function POST(request: Request) {
  const utilisateur = await getUtilisateur();
  if (!utilisateur) return nonAutorise("Non connecté");
  if (utilisateur.role !== "agent" && utilisateur.role !== "admin") {
    return nonAutorise();
  }

  const { consultationId } = await request.json();
  if (!consultationId) {
    return Response.json({ error: "consultationId manquant" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: consultation } = await supabase
    .from("consultations")
    .select("id, patiente_id, recit, agent_id")
    .eq("id", consultationId)
    .single();

  if (!consultation) {
    return Response.json({ error: "Consultation introuvable" }, { status: 404 });
  }
  if (utilisateur.role === "agent" && consultation.agent_id !== utilisateur.profilId) {
    return nonAutorise();
  }

  const { data: patiente } = await supabase
    .from("patientes")
    .select("nom, age")
    .eq("id", consultation.patiente_id)
    .single();

  // Anonymisation : le nom est remplacé par « la patiente » avant l'envoi (8.4).
  const recitAnonymise = anonymiserRecit(consultation.recit, patiente?.nom ?? null);

  // Extraction (DeepSeek) avec cache de démo en secours (section 8.4).
  let fiche = null;
  try {
    fiche = await extractionFiche(recitAnonymise);
  } catch {
    fiche = null;
  }

  let casDemo = null;
  if (!fiche) {
    casDemo = trouverCasDemo(consultation.recit);
    fiche = casDemo?.fiche ?? null;
  }

  if (!fiche) {
    return Response.json({ fiche: null, niveau: null, regles: [], explication: null });
  }

  const age = patiente?.age ?? 0;
  const classement = classer(fiche, age);

  let explication: string | null = null;
  try {
    explication = await explicationNiveau(classement.niveau, classement.regles);
  } catch {
    explication = casDemo?.explication ?? null;
  }

  await supabase
    .from("consultations")
    .update({
      fiche,
      niveau_propose: classement.niveau,
      regles_declenchees: classement.regles,
      explication,
      statut: "analysee",
    })
    .eq("id", consultationId);

  return Response.json({
    fiche,
    niveau: classement.niveau,
    regles: classement.regles,
    explication,
  });
}
