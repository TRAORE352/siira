/**
 * Couche d'accès aux données de Siira.
 *
 * TOUS LES ÉCRANS PASSENT PAR CE FICHIER, jamais par le magasin directement.
 * En Phase 1, l'implémentation travaille en mémoire dans le navigateur.
 * En Phase 2, elle sera remplacée par Supabase sans toucher aux écrans :
 * les signatures ci-dessous sont déjà asynchrones pour cette raison.
 */

import { chercherDansLeCache, explicationDeRepli, resumeDeRepli } from "../cache-demo";
import { calculerMontant, ongsCorrespondantes } from "../financement";
import { choisirCentre } from "../matching";
import type { PropositionCentre } from "../matching";
import { DELAI_TEXTE, classer, ficheVide } from "../regles";
import type {
  CapacitePaiement,
  Centre,
  Consultation,
  District,
  EtapeSuivi,
  Fiche,
  Financement,
  Niveau,
  Ong,
  Orientation,
  Patiente,
  Profil,
  RegleFinancement,
  ResultatSuivi,
  Role,
  Suivi,
} from "../types";
import { REFERENTIELS, abonner, lireEtat, modifier, reinitialiser } from "./magasin";

/* ------------------------------------------------------------------ */
/* Identifiants                                                        */
/* ------------------------------------------------------------------ */

function identifiant(prefixe: string): string {
  const alea =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefixe}-${alea}`;
}

function maintenant(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Référentiels                                                        */
/* ------------------------------------------------------------------ */

export function listerDistricts(): District[] {
  return REFERENTIELS.districts;
}

export function listerCentres(): Centre[] {
  return REFERENTIELS.centres;
}

export function trouverDistrict(id: string): District | undefined {
  return REFERENTIELS.districts.find((d) => d.id === id);
}

export function trouverCentre(id: string): Centre | undefined {
  return REFERENTIELS.centres.find((c) => c.id === id);
}

export function trouverProfil(id: string): Profil | undefined {
  return REFERENTIELS.profils.find((p) => p.id === id);
}

export function listerProfils(role?: Role): Profil[] {
  return role
    ? REFERENTIELS.profils.filter((p) => p.role === role)
    : REFERENTIELS.profils;
}

export function listerReglesFinancement(ongId?: string): RegleFinancement[] {
  const toutes = lireEtat().regles_financement;
  return ongId ? toutes.filter((r) => r.ong_id === ongId) : toutes;
}

export function trouverOng(id: string): Ong | undefined {
  return lireEtat().ongs.find((o) => o.id === id);
}

export function listerOngs(): Ong[] {
  return lireEtat().ongs;
}

/* ------------------------------------------------------------------ */
/* Lecture : espace agent                                              */
/* ------------------------------------------------------------------ */

export interface PatienteEnListe {
  patiente: Patiente;
  consultation: Consultation | null;
  orientation: Orientation | null;
  financement: Financement | null;
  district: District | undefined;
  centre: Centre | undefined;
  /** Vrai quand le centre a signalé que la patiente n'est pas venue. */
  absente: boolean;
}

export function listerPatientesAgent(agentId: string): PatienteEnListe[] {
  const e = lireEtat();
  return e.patientes
    .filter((p) => p.agent_id === agentId)
    .sort((a, b) => b.cree_le.localeCompare(a.cree_le))
    .map((patiente) => detailPatiente(patiente.id))
    .filter((d): d is PatienteEnListe => d !== null);
}

export function detailPatiente(patienteId: string): PatienteEnListe | null {
  const e = lireEtat();
  const patiente = e.patientes.find((p) => p.id === patienteId);
  if (!patiente) return null;
  const consultation =
    e.consultations
      .filter((c) => c.patiente_id === patienteId)
      .sort((a, b) => b.cree_le.localeCompare(a.cree_le))[0] ?? null;
  const orientation = consultation
    ? (e.orientations.find((o) => o.consultation_id === consultation.id) ?? null)
    : null;
  const financement = orientation
    ? (e.financements.find(
        (f) => f.orientation_id === orientation.id && f.statut === "confirmee",
      ) ??
      e.financements.find((f) => f.orientation_id === orientation.id) ??
      null)
    : null;
  return {
    patiente,
    consultation,
    orientation,
    financement,
    district: trouverDistrict(patiente.district_id),
    centre: orientation ? trouverCentre(orientation.centre_id) : undefined,
    absente: orientation?.statut === "absente",
  };
}

export function trouverConsultation(id: string): Consultation | null {
  return lireEtat().consultations.find((c) => c.id === id) ?? null;
}

export function trouverOrientationParConsultation(
  consultationId: string,
): Orientation | null {
  return (
    lireEtat().orientations.find((o) => o.consultation_id === consultationId) ?? null
  );
}

export function listerSuivis(orientationId: string): Suivi[] {
  return lireEtat()
    .suivis.filter((s) => s.orientation_id === orientationId)
    .sort((a, b) => a.cree_le.localeCompare(b.cree_le));
}

export function trouverCreneau(id: string) {
  return lireEtat().creneaux.find((c) => c.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Écriture : parcours de l'agent                                      */
/* ------------------------------------------------------------------ */

export interface NouvellePatiente {
  agent_id: string;
  nom: string;
  age: number;
  district_id: string;
  village: string | null;
  telephone: string | null;
  capacite_paiement: CapacitePaiement;
  consentement: boolean;
}

export function creerPatiente(donnees: NouvellePatiente): Patiente {
  if (!donnees.consentement) {
    throw new Error("Le consentement de la patiente est obligatoire.");
  }
  const patiente: Patiente = {
    id: identifiant("pat"),
    code: "",
    cree_le: maintenant(),
    ...donnees,
  };
  modifier((e) => {
    const numero = 400 + e.patientes.length * 7;
    patiente.code = `Cas ${String(numero).padStart(4, "0")}`;
    e.patientes.push(patiente);
  });
  return patiente;
}

export interface ResultatAnalyse {
  consultation: Consultation;
  /** Vrai quand aucune réponse enregistrée n'existe : l'agent remplit à la main. */
  fiche_a_remplir: boolean;
}

/**
 * Analyse un récit : fiche structurée, classement, explication.
 * Phase 1 : la fiche vient du cache de démonstration ou reste vide.
 */
export function analyserConsultation(entree: {
  patiente_id: string;
  agent_id: string;
  recit: string;
}): ResultatAnalyse {
  const patiente = lireEtat().patientes.find((p) => p.id === entree.patiente_id);
  if (!patiente) throw new Error("Patiente introuvable.");

  // Le nom de la patiente n'est jamais transmis à l'analyse.
  const recitAnonyme = anonymiserRecit(entree.recit, patiente.nom);
  const cache = chercherDansLeCache(recitAnonyme);
  const fiche = cache ? cache.fiche : ficheVide();
  const resultat = classer({ fiche, age: patiente.age });

  const consultation: Consultation = {
    id: identifiant("con"),
    patiente_id: patiente.id,
    agent_id: entree.agent_id,
    recit: entree.recit,
    fiche,
    niveau_propose: resultat.niveau,
    regles_declenchees: resultat.codes,
    explication:
      cache?.explication ??
      explicationDeRepli(resultat.regles, DELAI_TEXTE[resultat.niveau]),
    niveau_valide: null,
    raison_correction: null,
    commentaire_correction: null,
    statut: "analysee",
    cree_le: maintenant(),
  };

  modifier((e) => {
    e.consultations.push(consultation);
  });

  return { consultation, fiche_a_remplir: cache === null };
}

/** Remplace le nom saisi par « la patiente » avant toute analyse. */
export function anonymiserRecit(recit: string, nom: string): string {
  let sortie = recit;
  for (const morceau of nom.split(/\s+/).filter((m) => m.length >= 3)) {
    sortie = sortie.replace(new RegExp(morceau, "gi"), "la patiente");
  }
  return sortie;
}

/** L'agent corrige un champ de la fiche : le niveau est recalculé aussitôt. */
export function mettreAJourFiche(consultationId: string, fiche: Fiche): Consultation {
  let sortie: Consultation | null = null;
  modifier((e) => {
    const c = e.consultations.find((x) => x.id === consultationId);
    if (!c) throw new Error("Consultation introuvable.");
    const patiente = e.patientes.find((p) => p.id === c.patiente_id);
    if (!patiente) throw new Error("Patiente introuvable.");
    const resultat = classer({ fiche, age: patiente.age });
    c.fiche = fiche;
    c.niveau_propose = resultat.niveau;
    c.regles_declenchees = resultat.codes;
    c.explication = explicationDeRepli(resultat.regles, DELAI_TEXTE[resultat.niveau]);
    sortie = { ...c };
  });
  if (!sortie) throw new Error("Consultation introuvable.");
  return sortie;
}

export function validerNiveau(
  consultationId: string,
  options: {
    niveau: Niveau;
    raison_correction?: string | null;
    commentaire_correction?: string | null;
  },
): Consultation {
  let sortie: Consultation | null = null;
  modifier((e) => {
    const c = e.consultations.find((x) => x.id === consultationId);
    if (!c) throw new Error("Consultation introuvable.");
    const corrige = options.niveau !== c.niveau_propose;
    if (corrige && !options.raison_correction) {
      throw new Error("Une raison est obligatoire pour corriger le niveau.");
    }
    c.niveau_valide = options.niveau;
    c.raison_correction = corrige ? (options.raison_correction ?? null) : null;
    c.commentaire_correction = corrige ? (options.commentaire_correction ?? null) : null;
    c.statut = options.niveau === "vert" ? "close" : "validee";
    sortie = { ...c };
  });
  if (!sortie) throw new Error("Consultation introuvable.");
  return sortie;
}

/* ------------------------------------------------------------------ */
/* Orientation et financement                                          */
/* ------------------------------------------------------------------ */

export interface PropositionOrientation {
  proposition: PropositionCentre | null;
  alternatives: PropositionCentre[];
  aucun_dans_le_delai: boolean;
  /** Montant demandé aux ONG, ou null quand la patiente peut payer. */
  montant: ReturnType<typeof calculerMontant>;
  ongs_pressenties: Ong[];
}

/** Calcule la proposition d'orientation, sans rien enregistrer. */
export function preparerOrientation(consultationId: string): PropositionOrientation {
  const e = lireEtat();
  const c = e.consultations.find((x) => x.id === consultationId);
  if (!c) throw new Error("Consultation introuvable.");
  const patiente = e.patientes.find((p) => p.id === c.patiente_id);
  if (!patiente) throw new Error("Patiente introuvable.");
  const niveau = c.niveau_valide ?? c.niveau_propose;
  if (!niveau || niveau === "vert") {
    throw new Error("Aucune orientation pour un niveau vert.");
  }
  const district = trouverDistrict(patiente.district_id);
  if (!district) throw new Error("District introuvable.");

  const resultat = choisirCentre({
    niveau,
    district,
    centres: REFERENTIELS.centres,
    creneaux: e.creneaux,
    aujourdhui: new Date(),
  });

  const centreId = resultat.proposition?.centre.id ?? "";
  const montant = centreId
    ? calculerMontant(niveau, patiente.capacite_paiement, centreId, REFERENTIELS.tarifs)
    : null;

  const ongs = montant
    ? ongsCorrespondantes(
        {
          district_id: patiente.district_id,
          niveau,
          capacite_paiement: patiente.capacite_paiement,
          montant: montant.montant,
        },
        listerReglesFinancement(),
        e.ongs,
      )
    : [];

  return { ...resultat, montant, ongs_pressenties: ongs };
}

export interface EnvoiDossier {
  orientation: Orientation;
  financements: Financement[];
  message_patiente: string;
}

/**
 * Envoie le dossier au centre : réserve le créneau, crée les demandes de
 * financement et rédige le message destiné à la patiente.
 */
export function envoyerOrientation(entree: {
  consultation_id: string;
  centre_id: string;
  creneau_id: string;
  score: number;
}): EnvoiDossier {
  let sortie: EnvoiDossier | null = null;

  modifier((e) => {
    const c = e.consultations.find((x) => x.id === entree.consultation_id);
    if (!c) throw new Error("Consultation introuvable.");
    const patiente = e.patientes.find((p) => p.id === c.patiente_id);
    if (!patiente) throw new Error("Patiente introuvable.");
    const niveau = c.niveau_valide;
    if (!niveau || niveau === "vert") {
      throw new Error("Le niveau doit être validé avant l'envoi.");
    }
    const creneau = e.creneaux.find((x) => x.id === entree.creneau_id);
    if (!creneau || !creneau.libre) {
      throw new Error("Ce rendez-vous vient d'être pris. Choisissez un autre créneau.");
    }
    const centre = trouverCentre(entree.centre_id);
    if (!centre) throw new Error("Centre introuvable.");
    const district = trouverDistrict(patiente.district_id);

    creneau.libre = false;

    const cache = chercherDansLeCache(anonymiserRecit(c.recit, patiente.nom));
    const regles = c.regles_declenchees.map((code) => ({ libelle: code }));

    const orientation: Orientation = {
      id: identifiant("ori"),
      consultation_id: c.id,
      centre_id: entree.centre_id,
      creneau_id: entree.creneau_id,
      score: entree.score,
      resume_ia:
        cache?.resume ??
        resumeDeRepli(patiente.age, district?.nom ?? "non précisé", regles),
      statut: "envoyee",
      envoyee_le: maintenant(),
      cree_le: maintenant(),
    };
    e.orientations.push(orientation);

    // Demandes de financement : une par ONG correspondante.
    const montant = calculerMontant(
      niveau,
      patiente.capacite_paiement,
      entree.centre_id,
      REFERENTIELS.tarifs,
    );
    const financements: Financement[] = [];
    if (montant) {
      const ongs = ongsCorrespondantes(
        {
          district_id: patiente.district_id,
          niveau,
          capacite_paiement: patiente.capacite_paiement,
          montant: montant.montant,
        },
        listerReglesFinancement(),
        e.ongs,
      );
      for (const ong of ongs) {
        const f: Financement = {
          id: identifiant("fin"),
          orientation_id: orientation.id,
          ong_id: ong.id,
          montant: montant.montant,
          statut: "proposee",
          raison_refus: null,
          cree_le: maintenant(),
        };
        e.financements.push(f);
        financements.push(f);
      }
    }

    sortie = {
      orientation,
      financements,
      message_patiente: messagePourLaPatiente({
        prenom: patiente.nom.split(/\s+/)[0],
        centre: centre.nom,
        debut: creneau.debut,
      }),
    };
  });

  if (!sortie) throw new Error("L'envoi n'a pas abouti.");
  return sortie;
}

/** Texte du message qui sera lu à la patiente ou envoyé par SMS plus tard. */
export function messagePourLaPatiente(entree: {
  prenom: string;
  centre: string;
  debut: string;
}): string {
  const d = new Date(entree.debut);
  const jour = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `Bonjour ${entree.prenom}. Un rendez-vous est pris pour vous au ${entree.centre}, le ${jour} à ${heure}. Présentez-vous à l'accueil avec cette information. Siira.`;
}

/* ------------------------------------------------------------------ */
/* Espace centre spécialisé                                            */
/* ------------------------------------------------------------------ */

export interface DossierCentre {
  orientation: Orientation;
  consultation: Consultation;
  patiente: Patiente;
  district: District | undefined;
  agent: Profil | undefined;
  financement: Financement | null;
  creneau: { debut: string } | null;
  suivis: Suivi[];
}

const RANG_NIVEAU: Record<Niveau, number> = { rouge: 0, orange: 1, vert: 2 };

export function listerDossiersCentre(centreId: string): DossierCentre[] {
  const e = lireEtat();
  return e.orientations
    .filter((o) => o.centre_id === centreId && o.statut !== "brouillon")
    .map((orientation) => construireDossier(orientation.id))
    .filter((d): d is DossierCentre => d !== null)
    .sort((a, b) => {
      const na = a.consultation.niveau_valide ?? "vert";
      const nb = b.consultation.niveau_valide ?? "vert";
      return (
        RANG_NIVEAU[na] - RANG_NIVEAU[nb] ||
        (a.creneau?.debut ?? "").localeCompare(b.creneau?.debut ?? "")
      );
    });
}

export function construireDossier(orientationId: string): DossierCentre | null {
  const e = lireEtat();
  const orientation = e.orientations.find((o) => o.id === orientationId);
  if (!orientation) return null;
  const consultation = e.consultations.find((c) => c.id === orientation.consultation_id);
  if (!consultation) return null;
  const patiente = e.patientes.find((p) => p.id === consultation.patiente_id);
  if (!patiente) return null;
  return {
    orientation,
    consultation,
    patiente,
    district: trouverDistrict(patiente.district_id),
    agent: trouverProfil(consultation.agent_id),
    financement:
      e.financements.find(
        (f) => f.orientation_id === orientation.id && f.statut === "confirmee",
      ) ??
      e.financements.find((f) => f.orientation_id === orientation.id) ??
      null,
    creneau: e.creneaux.find((c) => c.id === orientation.creneau_id) ?? null,
    suivis: e.suivis
      .filter((s) => s.orientation_id === orientation.id)
      .sort((a, b) => a.cree_le.localeCompare(b.cree_le)),
  };
}

const STATUT_PAR_ETAPE: Record<EtapeSuivi, Orientation["statut"]> = {
  recue: "recue",
  examens: "examens",
  resultat: "resultat",
  absente: "absente",
};

export function enregistrerSuivi(entree: {
  orientation_id: string;
  etape: EtapeSuivi;
  resultat: ResultatSuivi;
  note: string | null;
  auteur_id: string;
}): Suivi {
  const suivi: Suivi = {
    id: identifiant("sui"),
    cree_le: maintenant(),
    ...entree,
  };
  modifier((e) => {
    const o = e.orientations.find((x) => x.id === entree.orientation_id);
    if (!o) throw new Error("Dossier introuvable.");
    o.statut = STATUT_PAR_ETAPE[entree.etape];
    e.suivis.push(suivi);
  });
  return suivi;
}

/* ------------------------------------------------------------------ */
/* Espace ONG : cas anonymes                                           */
/* ------------------------------------------------------------------ */

/**
 * Vue des cas pour les ONG.
 * Ni nom, ni téléphone, ni village, ni récit : cette fonction est la seule
 * source des écrans ONG.
 */
export interface CasAnonyme {
  financement_id: string;
  code: string;
  age: number;
  district: string;
  niveau: Niveau;
  capacite_paiement: CapacitePaiement;
  centre: string;
  soins: string[];
  montant: number;
  statut_financement: Financement["statut"];
  statut_orientation: Orientation["statut"];
  resultat: ResultatSuivi | null;
  rendez_vous: string | null;
  cree_le: string;
}

const LIBELLE_SOIN_COURT: Record<string, string> = {
  consultation: "Consultation spécialisée",
  echographie: "Échographie mammaire",
  biopsie: "Biopsie",
  transport: "Transport",
};

export function listerCasOng(ongId: string): CasAnonyme[] {
  const e = lireEtat();
  return e.financements
    .filter((f) => f.ong_id === ongId)
    .map((f): CasAnonyme | null => {
      const o = e.orientations.find((x) => x.id === f.orientation_id);
      if (!o) return null;
      const c = e.consultations.find((x) => x.id === o.consultation_id);
      if (!c) return null;
      const p = e.patientes.find((x) => x.id === c.patiente_id);
      if (!p) return null;
      const niveau = c.niveau_valide ?? "orange";
      const soins =
        niveau === "rouge"
          ? ["consultation", "echographie", "biopsie", "transport"]
          : ["consultation", "echographie", "transport"];
      const dernierSuivi = e.suivis
        .filter((s) => s.orientation_id === o.id && s.resultat !== "en_attente")
        .sort((a, b) => b.cree_le.localeCompare(a.cree_le))[0];
      return {
        financement_id: f.id,
        code: p.code,
        age: p.age,
        district: trouverDistrict(p.district_id)?.nom ?? "—",
        niveau,
        capacite_paiement: p.capacite_paiement,
        centre: trouverCentre(o.centre_id)?.nom ?? "—",
        soins: soins.map((s) => LIBELLE_SOIN_COURT[s] ?? s),
        montant: f.montant,
        statut_financement: f.statut,
        statut_orientation: o.statut,
        resultat: dernierSuivi?.resultat ?? null,
        rendez_vous: e.creneaux.find((x) => x.id === o.creneau_id)?.debut ?? null,
        cree_le: f.cree_le,
      };
    })
    .filter((c): c is CasAnonyme => c !== null)
    .sort((a, b) => b.cree_le.localeCompare(a.cree_le));
}

/**
 * Confirme un financement. Opération indivisible : la première ONG qui
 * accepte obtient le cas, les autres demandes passent à « retirée ».
 */
export function confirmerFinancement(financementId: string): Financement {
  let sortie: Financement | null = null;
  modifier((e) => {
    const f = e.financements.find((x) => x.id === financementId);
    if (!f) throw new Error("Demande introuvable.");
    if (f.statut !== "proposee") {
      throw new Error("Cette demande n'est plus disponible.");
    }
    const dejaPris = e.financements.some(
      (x) => x.orientation_id === f.orientation_id && x.statut === "confirmee",
    );
    if (dejaPris) throw new Error("Ce cas vient d'être financé par une autre ONG.");
    const ong = e.ongs.find((o) => o.id === f.ong_id);
    if (!ong) throw new Error("ONG introuvable.");
    if (ong.budget_restant < f.montant) {
      throw new Error("Le budget restant ne couvre pas ce montant.");
    }

    f.statut = "confirmee";
    ong.budget_restant -= f.montant;
    for (const autre of e.financements) {
      if (
        autre.orientation_id === f.orientation_id &&
        autre.id !== f.id &&
        autre.statut === "proposee"
      ) {
        autre.statut = "retiree";
      }
    }
    sortie = { ...f };
  });
  if (!sortie) throw new Error("La confirmation n'a pas abouti.");
  return sortie;
}

export function refuserFinancement(
  financementId: string,
  raison: string | null,
): Financement {
  let sortie: Financement | null = null;
  modifier((e) => {
    const f = e.financements.find((x) => x.id === financementId);
    if (!f) throw new Error("Demande introuvable.");
    if (f.statut !== "proposee") throw new Error("Cette demande n'est plus en attente.");
    f.statut = "refusee";
    f.raison_refus = raison;
    sortie = { ...f };
  });
  if (!sortie) throw new Error("Le refus n'a pas abouti.");
  return sortie;
}

export function enregistrerRegleFinancement(regle: RegleFinancement): void {
  modifier((e) => {
    const i = e.regles_financement.findIndex((r) => r.id === regle.id);
    if (i >= 0) e.regles_financement[i] = regle;
    else e.regles_financement.push(regle);
  });
}

/* ------------------------------------------------------------------ */
/* Impact d'une ONG : chaque chiffre est calculé                        */
/* ------------------------------------------------------------------ */

export interface Impact {
  budget_total: number;
  budget_utilise: number;
  budget_restant: number;
  femmes_financees: number;
  femmes_venues: number;
  resultats_connus: number;
  delai_moyen_jours: number | null;
  par_district: { district: string; nombre: number }[];
}

export function calculerImpact(ongId: string): Impact {
  const e = lireEtat();
  const ong = e.ongs.find((o) => o.id === ongId);
  const confirmes = e.financements.filter(
    (f) => f.ong_id === ongId && f.statut === "confirmee",
  );

  let venues = 0;
  let resultats = 0;
  const delais: number[] = [];
  const districts = new Map<string, number>();

  for (const f of confirmes) {
    const o = e.orientations.find((x) => x.id === f.orientation_id);
    if (!o) continue;
    const c = e.consultations.find((x) => x.id === o.consultation_id);
    const p = c ? e.patientes.find((x) => x.id === c.patiente_id) : undefined;

    if (["recue", "examens", "resultat", "close"].includes(o.statut)) venues += 1;
    if (
      e.suivis.some(
        (s) => s.orientation_id === o.id && s.etape === "resultat" && s.resultat !== "en_attente",
      )
    ) {
      resultats += 1;
    }

    const creneau = e.creneaux.find((x) => x.id === o.creneau_id);
    if (c && creneau) {
      const jours =
        (new Date(creneau.debut).getTime() - new Date(c.cree_le).getTime()) /
        (24 * 60 * 60 * 1000);
      if (Number.isFinite(jours)) delais.push(Math.max(0, Math.round(jours)));
    }

    if (p) {
      const nom = trouverDistrict(p.district_id)?.nom ?? "Non précisé";
      districts.set(nom, (districts.get(nom) ?? 0) + 1);
    }
  }

  const utilise = confirmes.reduce((s, f) => s + f.montant, 0);

  return {
    budget_total: ong?.budget_total ?? 0,
    budget_utilise: utilise,
    budget_restant: ong?.budget_restant ?? 0,
    femmes_financees: confirmes.length,
    femmes_venues: venues,
    resultats_connus: resultats,
    delai_moyen_jours:
      delais.length > 0
        ? Math.round((delais.reduce((s, d) => s + d, 0) / delais.length) * 10) / 10
        : null,
    par_district: Array.from(districts.entries())
      .map(([district, nombre]) => ({ district, nombre }))
      .sort((a, b) => b.nombre - a.nombre),
  };
}

/* ------------------------------------------------------------------ */
/* Abonnement et réinitialisation                                      */
/* ------------------------------------------------------------------ */

export { abonner, reinitialiser, lireEtat };
