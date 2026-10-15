// POST /api/orienter — matching + création de l'orientation (brouillon) et des
// demandes de financement (proposee) pour les ONG correspondantes.
import { getUtilisateur, nonAutorise } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculerMatching, type CentreAvecCreneaux } from "@/lib/matching";
import { montantDemande, ongsCorrespondants } from "@/lib/financement";
import type { CapacitePaiement, RegleFinancement } from "@/lib/types";

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
    .select("id, patiente_id, agent_id, niveau_valide, fiche")
    .eq("id", consultationId)
    .single();

  if (!consultation) {
    return Response.json({ error: "Consultation introuvable" }, { status: 404 });
  }
  if (utilisateur.role === "agent" && consultation.agent_id !== utilisateur.profilId) {
    return nonAutorise();
  }
  if (!consultation.niveau_valide || consultation.niveau_valide === "vert") {
    return Response.json({ error: "Niveau vert : aucune orientation" }, { status: 400 });
  }

  const niveau = consultation.niveau_valide as "orange" | "rouge";

  const { data: patiente } = await supabase
    .from("patientes")
    .select("district_id, capacite_paiement")
    .eq("id", consultation.patiente_id)
    .single();
  if (!patiente) {
    return Response.json({ error: "Patiente introuvable" }, { status: 404 });
  }

  const { data: district } = await supabase
    .from("districts")
    .select("latitude, longitude")
    .eq("id", patiente.district_id)
    .single();

  const [{ data: centres }, { data: creneaux }, { data: tarifs }] = await Promise.all([
    supabase.from("centres").select("*"),
    supabase.from("creneaux").select("*"),
    supabase.from("tarifs").select("*"),
  ]);

  const centresAvecCreneaux: CentreAvecCreneaux[] = (centres ?? []).map((c) => ({
    id: c.id,
    nom: c.nom,
    service: c.service,
    latitude: c.latitude,
    longitude: c.longitude,
    examens: c.examens ?? [],
    placesSemaine: c.places_semaine ?? 0,
    actif: c.actif,
    creneaux: (creneaux ?? [])
      .filter((cr) => cr.centre_id === c.id)
      .map((cr) => ({ id: cr.id, centreId: cr.centre_id, debut: cr.debut, libre: cr.libre })),
  }));

  const resultat = calculerMatching(
    centresAvecCreneaux,
    { latitude: district?.latitude ?? 0, longitude: district?.longitude ?? 0 },
    niveau,
    new Date(),
  );

  const choisi = resultat.meilleur ?? resultat.secours;
  if (!choisi) {
    return Response.json({ error: "Aucun centre disponible" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: orientation, error: errOrientation } = await admin
    .from("orientations")
    .insert({
      consultation_id: consultationId,
      centre_id: choisi.centre.id,
      creneau_id: choisi.prochainCreneau?.id ?? null,
      score: choisi.score,
      statut: "brouillon",
    })
    .select()
    .single();
  if (errOrientation) {
    return Response.json({ error: errOrientation.message }, { status: 400 });
  }

  const tarifsCentre = (tarifs ?? []).filter((t) => t.centre_id === choisi.centre.id);
  const montant = montantDemande(niveau, tarifsCentre as never);

  // Règles de financement actives + budgets.
  const [{ data: regles }, { data: ongs }] = await Promise.all([
    supabase.from("regles_financement").select("*").eq("active", true),
    supabase.from("ong").select("id, budget_restant"),
  ]);

  const reglesFinancement: RegleFinancement[] = (regles ?? []).map((r) => ({
    id: r.id,
    ongId: r.ong_id,
    districts: r.districts ?? [],
    niveaux: r.niveaux ?? [],
    situations: r.situations ?? [],
    active: r.active,
  }));

  const budgetParOng = (ongId: string) =>
    ongs?.find((o) => o.id === ongId)?.budget_restant ?? 0;

  const financeurs = ongsCorrespondants(
    reglesFinancement,
    {
      districtId: patiente.district_id,
      niveau,
      capacitePaiement: patiente.capacite_paiement as CapacitePaiement,
    },
    montant,
    budgetParOng,
  );

  const financementsCrees = [];
  for (const f of financeurs) {
    const { data, error } = await admin
      .from("financements")
      .insert({
        orientation_id: orientation.id,
        ong_id: f.regle.ongId,
        montant: f.contribution,
        statut: "proposee",
      })
      .select()
      .single();
    if (!error && data) financementsCrees.push(data);
  }

  return Response.json({
    centre: choisi.centre,
    creneau: choisi.prochainCreneau,
    score: choisi.score,
    horsDelai: resultat.aucunCentreDansLeDelai,
    tousCentres: resultat.tous.map((r) => ({
      id: r.centre.id,
      nom: r.centre.nom,
      service: r.centre.service,
      distanceKm: Math.round(r.distanceKm * 10) / 10,
      score: Math.round(r.score * 10) / 10,
      debut: r.prochainCreneau?.debut ?? null,
    })),
    montant,
    financements: financementsCrees,
  });
}
