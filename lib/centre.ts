// Données de l'espace centre (rôle « centre »).
//
// Le centre ne peut pas lire `ong` ni les `profils` des agents via la RLS
// (section 11.1 du cahier des charges), mais il a besoin :
//   - du nom du partenaire (rubrique « Prises en charge »),
//   - de l'agent d'origine et de son centre de santé (dossier, exigence CE-06).
// Ces deux tables sont donc lues via le client service_role, en filtrant
// UNIQUEMENT par des identifiants issus de données déjà autorisées par la RLS.
// Toute autre lecture passe par le client standard : la RLS garantit que le
// centre ne voit que les orientations envoyées à son propre centre.

import { getUtilisateur, type ContexteUtilisateur } from "./auth";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { FicheStructuree } from "./types";

/** Vrai si les variables Supabase nécessaires au rendu sont définies. */
export function supabaseConfigure(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Vrai si la clé service_role (lectures complémentaires serveur) est là. */
function adminDisponible(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Contexte authentifié d'un compte « centre » (null si absent ou autre rôle). */
export async function getContexteCentre(): Promise<ContexteUtilisateur | null> {
  if (!supabaseConfigure()) return null;
  const utilisateur = await getUtilisateur();
  if (!utilisateur) return null;
  if (utilisateur.role !== "centre") return null;
  return utilisateur;
}

export interface CentreInfo {
  id: string;
  nom: string;
  service: string | null;
  examens: string[];
  placesSemaine: number;
  actif: boolean;
}

export async function getCentreInfo(centreId: string): Promise<CentreInfo | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("centres")
    .select("*")
    .eq("id", centreId)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    nom: data.nom,
    service: data.service ?? null,
    examens: (data.examens ?? []) as string[],
    placesSemaine: data.places_semaine ?? 0,
    actif: data.actif,
  };
}

export interface FinancementCentre {
  id: string;
  ongNom: string;
  montant: number;
  statut: string;
  raisonRefus: string | null;
}

export interface SuiviCentre {
  id: string;
  etape: string;
  resultat: string;
  note: string | null;
  creeLe: string;
  auteurNom: string | null;
}

export interface DossierCentre {
  orientationId: string;
  statut: string;
  score: number | null;
  resumeIa: string | null;
  envoyeeLe: string | null;
  rendezVous: string | null;
  recit: string;
  fiche: FicheStructuree | null;
  niveauPropose: string | null;
  niveauValide: string | null;
  reglesDeclenchees: string[];
  explication: string | null;
  raisonCorrection: string | null;
  commentaireCorrection: string | null;
  patiente: {
    nom: string;
    age: number;
    code: string;
    village: string | null;
    telephone: string | null;
    capacitePaiement: string;
    district: string;
  };
  agentNom: string | null;
  agentCentreSante: string | null;
  financements: FinancementCentre[];
  suivis: SuiviCentre[];
}

/** Tous les dossiers (orientations) reçus par un centre, avec toutes les
 * informations nécessaires aux listes, au dossier et aux indicateurs. */
export async function getDossiersCentre(centreId: string): Promise<DossierCentre[]> {
  const supabase = await createClient();

  const { data: orientations } = await supabase
    .from("orientations")
    .select("id, consultation_id, creneau_id, score, resume_ia, statut, envoyee_le")
    .eq("centre_id", centreId);

  if (!orientations || orientations.length === 0) return [];

  const orientationIds = orientations.map((o) => o.id);
  const consultationIds = orientations.map((o) => o.consultation_id);
  const creneauIds = orientations
    .map((o) => o.creneau_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: consultations }, { data: creneaux }] = await Promise.all([
    supabase
      .from("consultations")
      .select(
        "id, patiente_id, agent_id, recit, fiche, niveau_propose, niveau_valide, regles_declenchees, explication, raison_correction, commentaire_correction",
      )
      .in("id", consultationIds),
    supabase.from("creneaux").select("id, debut").in("id", creneauIds),
  ]);

  const patienteIds = (consultations ?? []).map((c) => c.patiente_id);

  const [{ data: patientes }, { data: districts }, { data: financements }, { data: suivis }] =
    await Promise.all([
      supabase
        .from("patientes")
        .select("id, nom, age, code, village, telephone, capacite_paiement, district_id")
        .in("id", patienteIds),
      supabase.from("districts").select("id, nom"),
      supabase
        .from("financements")
        .select("id, orientation_id, ong_id, montant, statut, raison_refus")
        .in("orientation_id", orientationIds),
      supabase
        .from("suivis")
        .select("id, orientation_id, etape, resultat, note, cree_le, auteur_id")
        .in("orientation_id", orientationIds)
        .order("cree_le", { ascending: true }),
    ]);

  // --- Lectures complémentaires (service_role) : noms ONG + noms des profils.
  const ongIds = [...new Set((financements ?? []).map((f) => f.ong_id))];
  const profilIds = [
    ...new Set([
      ...(consultations ?? []).map((c) => c.agent_id),
      ...(suivis ?? []).map((s) => s.auteur_id),
    ]),
  ];

  const nomOng = new Map<string, string>();
  const nomProfil = new Map<string, { nom: string; centreSante: string | null }>();

  if (adminDisponible()) {
    const admin = createAdminClient();
    const [ongRows, profilRows] = await Promise.all([
      ongIds.length
        ? admin.from("ong").select("id, nom").in("id", ongIds)
        : Promise.resolve({ data: [] as { id: string; nom: string }[] }),
      profilIds.length
        ? admin
            .from("profils")
            .select("id, nom, centre_sante")
            .in("id", profilIds)
        : Promise.resolve({
            data: [] as { id: string; nom: string; centre_sante: string | null }[],
          }),
    ]);
    for (const o of ongRows.data ?? []) nomOng.set(o.id, o.nom);
    for (const p of profilRows.data ?? [])
      nomProfil.set(p.id, { nom: p.nom, centreSante: p.centre_sante });
  }

  const patienteParId = new Map((patientes ?? []).map((p) => [p.id, p]));
  const consultationParId = new Map((consultations ?? []).map((c) => [c.id, c]));
  const creneauParId = new Map((creneaux ?? []).map((c) => [c.id, c]));
  const districtParId = new Map((districts ?? []).map((d) => [d.id, d.nom]));

  const financementsParOrientation = new Map<string, FinancementCentre[]>();
  for (const f of financements ?? []) {
    const liste = financementsParOrientation.get(f.orientation_id) ?? [];
    liste.push({
      id: f.id,
      ongNom: nomOng.get(f.ong_id) ?? "Partenaire",
      montant: f.montant,
      statut: f.statut,
      raisonRefus: f.raison_refus ?? null,
    });
    financementsParOrientation.set(f.orientation_id, liste);
  }

  const suivisParOrientation = new Map<string, SuiviCentre[]>();
  for (const s of suivis ?? []) {
    const liste = suivisParOrientation.get(s.orientation_id) ?? [];
    liste.push({
      id: s.id,
      etape: s.etape,
      resultat: s.resultat,
      note: s.note ?? null,
      creeLe: s.cree_le,
      auteurNom: nomProfil.get(s.auteur_id)?.nom ?? null,
    });
    suivisParOrientation.set(s.orientation_id, liste);
  }

  return orientations.map((o): DossierCentre => {
    const consultation = consultationParId.get(o.consultation_id);
    const patiente = consultation
      ? patienteParId.get(consultation.patiente_id)
      : undefined;
    const creneau = creneauParId.get(o.creneau_id ?? "");
    const agent = consultation
      ? nomProfil.get(consultation.agent_id) ?? null
      : null;

    return {
      orientationId: o.id,
      statut: o.statut,
      score: o.score ?? null,
      resumeIa: o.resume_ia ?? null,
      envoyeeLe: o.envoyee_le ?? null,
      rendezVous: creneau?.debut ?? null,
      recit: consultation?.recit ?? "",
      fiche: (consultation?.fiche as FicheStructuree | null) ?? null,
      niveauPropose: consultation?.niveau_propose ?? null,
      niveauValide: consultation?.niveau_valide ?? null,
      reglesDeclenchees: (consultation?.regles_declenchees ?? []) as string[],
      explication: consultation?.explication ?? null,
      raisonCorrection: consultation?.raison_correction ?? null,
      commentaireCorrection: consultation?.commentaire_correction ?? null,
      patiente: {
        nom: patiente?.nom ?? "—",
        age: patiente?.age ?? 0,
        code: patiente?.code ?? "—",
        village: patiente?.village ?? null,
        telephone: patiente?.telephone ?? null,
        capacitePaiement: patiente?.capacite_paiement ?? "ne_peut_pas",
        district: patiente ? (districtParId.get(patiente.district_id) ?? "—") : "—",
      },
      agentNom: agent?.nom ?? null,
      agentCentreSante: agent?.centreSante ?? null,
      financements: financementsParOrientation.get(o.id) ?? [],
      suivis: suivisParOrientation.get(o.id) ?? [],
    };
  });
}

export async function getDossierCentre(
  centreId: string,
  orientationId: string,
): Promise<DossierCentre | null> {
  const dossiers = await getDossiersCentre(centreId);
  return dossiers.find((d) => d.orientationId === orientationId) ?? null;
}

// --- Indicateurs (exigence CE-05, adaptée au découpage demandé) -------------

/** Statuts « en cours de prise en charge » (le dossier n'est pas clos). */
const STATUTS_ACTIFS = ["envoyee", "recue", "examens"];

export interface IndicateursCentre {
  rdvSemaine: number;
  casRougesAttente: number;
  prisesEnChargeADemander: number;
}

export function calculerIndicateurs(
  dossiers: DossierCentre[],
  maintenant: Date,
): IndicateursCentre {
  const dans7Jours = maintenant.getTime() + 7 * 24 * 3600 * 1000;

  const rdvSemaine = dossiers.filter((d) => {
    if (!d.rendezVous) return false;
    if (d.statut === "absente" || d.statut === "close") return false;
    const t = new Date(d.rendezVous).getTime();
    return t >= maintenant.getTime() && t <= dans7Jours;
  }).length;

  const casRougesAttente = dossiers.filter(
    (d) => d.niveauValide === "rouge" && STATUTS_ACTIFS.includes(d.statut),
  ).length;

  const prisesEnChargeADemander = dossiers.reduce(
    (total, d) =>
      total + d.financements.filter((f) => f.statut === "proposee").length,
    0,
  );

  return { rdvSemaine, casRougesAttente, prisesEnChargeADemander };
}

// --- Libellés français (ré-exportés pour les composants serveur) -------------

export {
  formatFCFA,
  LIBELLE_SOIN,
  LIBELLE_STATUT_ORIENTATION,
  LIBELLE_STATUT_FINANCEMENT,
  LIBELLE_RESULTAT,
  LIBELLE_ETAPE,
} from "./libelles";
