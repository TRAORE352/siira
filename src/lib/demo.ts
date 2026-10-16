/**
 * Données de démonstration de Siira.
 *
 * ENTIÈREMENT FICTIF. Aucune donnée réelle de patiente.
 * Les noms des centres sont réels, mais leurs examens, places, créneaux et
 * tarifs sont inventés pour la démonstration.
 *
 * Les coordonnées des chefs-lieux et des hôpitaux sont approximatives
 * (relevé public, à vérifier avec le commanditaire — voir DECISIONS.md).
 */

import type {
  Centre,
  Consultation,
  Creneau,
  District,
  Financement,
  Ong,
  Orientation,
  Patiente,
  Profil,
  RegleFinancement,
  Suivi,
  Tarif,
} from "./types";

/* ------------------------------------------------------------------ */
/* Repères de temps                                                     */
/* ------------------------------------------------------------------ */

/** Minuit du jour courant, pour que la démo soit toujours « aujourd'hui ». */
export function aujourdhui(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function jours(n: number, heure = 9): string {
  const d = aujourdhui();
  d.setDate(d.getDate() + n);
  d.setHours(heure, 0, 0, 0);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Districts                                                            */
/* ------------------------------------------------------------------ */

export const DISTRICTS: District[] = [
  { id: "dis-saaba", nom: "Saaba", latitude: 12.3858, longitude: -1.3678 },
  { id: "dis-ziniare", nom: "Ziniaré", latitude: 12.5819, longitude: -1.2969 },
  { id: "dis-koubri", nom: "Koubri", latitude: 12.1878, longitude: -1.4017 },
  { id: "dis-loumbila", nom: "Loumbila", latitude: 12.5086, longitude: -1.4053 },
];

/* ------------------------------------------------------------------ */
/* Centres spécialisés                                                  */
/* ------------------------------------------------------------------ */

export const CENTRES: Centre[] = [
  {
    id: "cen-bogodogo",
    nom: "CHU de Bogodogo",
    service: "Service de gynécologie et sénologie",
    latitude: 12.3217,
    longitude: -1.4694,
    type: "specialise",
    examens: ["echographie", "mammographie", "biopsie"],
    places_semaine: 10,
    actif: true,
  },
  {
    id: "cen-tengandogo",
    nom: "CHU de Tengandogo",
    service: "Service d'oncologie",
    latitude: 12.2894,
    longitude: -1.4747,
    type: "specialise",
    examens: ["echographie", "biopsie"],
    places_semaine: 8,
    actif: true,
  },
  {
    id: "cen-yalgado",
    nom: "CHU Yalgado Ouédraogo",
    service: "Service de chirurgie générale",
    latitude: 12.3772,
    longitude: -1.5203,
    type: "specialise",
    examens: ["echographie", "mammographie", "biopsie"],
    places_semaine: 12,
    actif: true,
  },
  {
    id: "cen-ziniare",
    nom: "CHR de Ziniaré",
    service: "Maternité et imagerie",
    latitude: 12.5819,
    longitude: -1.2969,
    type: "specialise",
    examens: ["echographie"],
    places_semaine: 6,
    actif: true,
  },
];

/* ------------------------------------------------------------------ */
/* Structures de base — là où l'agent exerce                            */
/* ------------------------------------------------------------------ */

/*
 * Ce sont les lieux de travail proposés à l'agent lors de son inscription,
 * pas des destinations : `places_semaine` vaut 0 et `examens` est vide,
 * et le filtre d'orientation les écarte de toute façon sur leur `type`.
 * Elles existent ici pour que l'inscription propose une vraie liste même
 * sans réseau — c'est ce qui fait tenir la démonstration du jury.
 */
export const STRUCTURES_DE_BASE: Centre[] = [
  ["csps-dassasgho", "CSPS de Dassasgho", "Ouagadougou — Bogodogo", 12.3889, -1.4639],
  ["csps-wemtenga", "CSPS de Wemtenga", "Ouagadougou — Bogodogo", 12.3744, -1.4792],
  ["csps-zogona", "CSPS de Zogona", "Ouagadougou — Bogodogo", 12.3817, -1.4919],
  ["csps-pissy", "CSPS de Pissy", "Ouagadougou — Boulmiougou", 12.3372, -1.5614],
  ["csps-kilwin", "CSPS de Kilwin", "Ouagadougou — Boulmiougou", 12.3889, -1.5589],
  ["csps-tanghin", "CSPS de Tanghin", "Ouagadougou — Nongr-Massom", 12.4089, -1.5047],
  ["csps-polesgo", "CSPS de Polesgo", "Ouagadougou — Nongr-Massom", 12.4417, -1.4583],
  ["csps-nioko2", "CSPS de Nioko II", "Ouagadougou — Nongr-Massom", 12.4283, -1.4506],
  ["csps-kossodo", "CSPS de Kossodo", "Ouagadougou — Nongr-Massom", 12.4194, -1.4903],
  ["csps-somgande", "CSPS de Somgandé", "Ouagadougou — Sig-Nonghin", 12.4247, -1.5106],
  ["csps-cissin", "CSPS de Cissin", "Ouagadougou — Baskuy", 12.345, -1.5333],
  ["csps-gounghin", "CSPS de Gounghin", "Ouagadougou — Baskuy", 12.3672, -1.5456],
  ["csps-saaba", "CSPS de Saaba", "Saaba", 12.3858, -1.3678],
  ["csps-koubri", "CSPS de Koubri", "Koubri", 12.1878, -1.4017],
  ["csps-loumbila", "CSPS de Loumbila", "Loumbila", 12.5086, -1.4053],
  ["cma-pissy", "CMA de Pissy", "Ouagadougou — Boulmiougou", 12.34, -1.565],
  ["cma-secteur30", "CMA du Secteur 30", "Ouagadougou — Bogodogo", 12.3406, -1.4989],
  ["cma-kossodo", "CMA de Kossodo", "Ouagadougou — Nongr-Massom", 12.4211, -1.4878],
  ["cma-ziniare", "CMA de Ziniaré", "Ziniaré", 12.5819, -1.2969],
].map(([id, nom, service, latitude, longitude]) => ({
  id: id as string,
  nom: nom as string,
  service: service as string,
  type: "base" as const,
  latitude: latitude as number,
  longitude: longitude as number,
  examens: [],
  places_semaine: 0,
  actif: true,
}));

/* ------------------------------------------------------------------ */
/* Créneaux : 30 prochains jours, du lundi au vendredi                  */
/* ------------------------------------------------------------------ */

/** Décalage du premier créneau libre de chaque centre, pour varier la démo. */
const PREMIER_JOUR: Record<string, number> = {
  "cen-bogodogo": 2,
  "cen-tengandogo": 4,
  "cen-yalgado": 1,
  "cen-ziniare": 9,
};

const HEURES = [8, 10, 14];

export function creneauxDemo(): Creneau[] {
  const liste: Creneau[] = [];
  for (const centre of CENTRES) {
    const debut = PREMIER_JOUR[centre.id] ?? 1;
    for (let j = debut; j <= 30; j += 1) {
      const d = aujourdhui();
      d.setDate(d.getDate() + j);
      const jourSemaine = d.getDay();
      if (jourSemaine === 0 || jourSemaine === 6) continue; // pas le week-end
      for (const h of HEURES) {
        liste.push({
          id: `cre-${centre.id}-${j}-${h}`,
          centre_id: centre.id,
          debut: jours(j, h),
          libre: true,
        });
      }
    }
  }
  return liste;
}

/* ------------------------------------------------------------------ */
/* Tarifs : montants fictifs, identiques dans tous les centres          */
/* ------------------------------------------------------------------ */

const GRILLE_TARIFS: { soin: Tarif["soin"]; montant: number }[] = [
  { soin: "consultation", montant: 10000 },
  { soin: "echographie", montant: 15000 },
  { soin: "biopsie", montant: 35000 },
  { soin: "transport", montant: 5000 },
];

export const TARIFS: Tarif[] = CENTRES.flatMap((c) =>
  GRILLE_TARIFS.map((t) => ({ centre_id: c.id, ...t })),
);

/* ------------------------------------------------------------------ */
/* ONG et leurs règles                                                  */
/* ------------------------------------------------------------------ */

export const ONGS: Ong[] = [
  {
    id: "ong-a",
    nom: "Fonds Yennenga",
    budget_total: 2000000,
    budget_restant: 1420000,
  },
  {
    id: "ong-b",
    nom: "Alliance Wendpanga",
    budget_total: 3500000,
    budget_restant: 2780000,
  },
];

export const REGLES_FINANCEMENT: RegleFinancement[] = [
  {
    id: "reg-a1",
    ong_id: "ong-a",
    districts: ["dis-saaba", "dis-koubri"],
    niveaux: ["rouge"],
    situations: ["ne_peut_pas", "partielle"],
    active: true,
  },
  {
    id: "reg-b1",
    ong_id: "ong-b",
    districts: ["dis-saaba", "dis-ziniare", "dis-koubri", "dis-loumbila"],
    niveaux: ["orange", "rouge"],
    situations: ["ne_peut_pas", "partielle"],
    active: true,
  },
];

/* ------------------------------------------------------------------ */
/* Comptes de démonstration                                             */
/* ------------------------------------------------------------------ */

export const PROFILS: Profil[] = [
  {
    id: "pro-agent-saaba",
    nom: "Salimata Ouédraogo",
    email: "agent.saaba@siira.demo",
    role: "agent",
    centre_sante: "Centre de santé de Saaba",
    centre_id: null,
    ong_id: null,
  },
  {
    id: "pro-agent-ziniare",
    nom: "Boukary Sawadogo",
    email: "agent.ziniare@siira.demo",
    role: "agent",
    centre_sante: "Centre de santé de Ziniaré",
    centre_id: null,
    ong_id: null,
  },
  {
    id: "pro-agent-koubri",
    nom: "Mariam Kaboré",
    email: "agent.koubri@siira.demo",
    role: "agent",
    centre_sante: "Centre de santé de Koubri",
    centre_id: null,
    ong_id: null,
  },
  {
    id: "pro-centre-bogodogo",
    nom: "Dr Alimata Zongo",
    email: "centre.bogodogo@siira.demo",
    role: "centre",
    centre_sante: null,
    centre_id: "cen-bogodogo",
    ong_id: null,
  },
  {
    id: "pro-centre-tengandogo",
    nom: "Dr Issa Compaoré",
    email: "centre.tengandogo@siira.demo",
    role: "centre",
    centre_sante: null,
    centre_id: "cen-tengandogo",
    ong_id: null,
  },
  {
    id: "pro-centre-yalgado",
    nom: "Dr Rasmata Nikiéma",
    email: "centre.yalgado@siira.demo",
    role: "centre",
    centre_sante: null,
    centre_id: "cen-yalgado",
    ong_id: null,
  },
  {
    id: "pro-centre-ziniare",
    nom: "Dr Paul Ilboudo",
    email: "centre.ziniare@siira.demo",
    role: "centre",
    centre_sante: null,
    centre_id: "cen-ziniare",
    ong_id: null,
  },
  {
    id: "pro-admin",
    nom: "Équipe Siira",
    email: "admin@siira.demo",
    role: "admin",
    centre_sante: null,
    centre_id: null,
    ong_id: null,
    /*
     * L'équipe entre par ce matricule sur l'écran de connexion. Sans lui, plus
     * rien ne mène à /admin, où l'on réinitialise la démonstration.
     */
    matricule: "SIIRA-ADMIN",
  },
];

/* ------------------------------------------------------------------ */
/* Patientes déjà suivies, pour remplir les listes et le tableau d'impact */
/* ------------------------------------------------------------------ */

interface Historique {
  patiente: Patiente;
  consultation: Consultation;
  orientation?: Orientation;
  financement?: Financement;
  suivis?: Suivi[];
}

let compteurCode = 100;
function code(): string {
  compteurCode += 7;
  return `Cas ${String(compteurCode).padStart(4, "0")}`;
}

function fiche(partiel: Partial<Consultation["fiche"]> = {}): Consultation["fiche"] {
  return {
    sein: null,
    masse: null,
    masse_dure: null,
    masse_fixe: null,
    duree_semaines: null,
    douleur: null,
    peau: [],
    mamelon_retraction_recente: null,
    ecoulement: null,
    ecoulement_un_cote: null,
    ganglion_aisselle: null,
    antecedents_personnels: null,
    statut_menopause: null,
    fievre: null,
    grossesse_ou_allaitement: null,
    depistage_a_jour: null,
    antecedents_familiaux: null,
    autres: null,
    ...partiel,
  } as Consultation["fiche"];
}

/**
 * Historique fictif. Construit à l'appel pour que les dates restent
 * relatives au jour de la démonstration.
 */
export function historiqueDemo(): Historique[] {
  compteurCode = 100;
  return [
    {
      patiente: {
        id: "pat-1",
        code: code(),
        agent_id: "pro-agent-saaba",
        nom: "Habibou Sankara",
        age: 47,
        district_id: "dis-saaba",
        village: "Saaba centre",
        telephone: "70112233",
        capacite_paiement: "ne_peut_pas",
        consentement: true,
        cree_le: jours(-18),
      },
      consultation: {
        id: "con-1",
        patiente_id: "pat-1",
        agent_id: "pro-agent-saaba",
        recit:
          "Elle a senti une boule dans le sein droit il y a environ trois mois. La boule est dure et ne bouge pas sous les doigts.",
        fiche: fiche({
          sein: "droit",
          masse: true,
          masse_dure: true,
          masse_fixe: true,
          duree_semaines: 12,
          douleur: "aucune",
        }),
        niveau_propose: "rouge",
        regles_declenchees: ["R4", "R5", "O1"],
        explication:
          "Une masse dure et fixée est présente depuis douze semaines. Ces éléments demandent un avis spécialisé rapide.",
        niveau_valide: "rouge",
        raison_correction: null,
        commentaire_correction: null,
        statut: "validee",
        cree_le: jours(-18),
      },
      orientation: {
        id: "ori-1",
        consultation_id: "con-1",
        centre_id: "cen-bogodogo",
        creneau_id: "cre-historique-1",
        score: 82.4,
        resume_ia:
          "Patiente de 47 ans. Masse du sein droit, dure et fixée, évoluant depuis 12 semaines. Pas de douleur rapportée. Pas de signe cutané décrit. Orientation pour échographie et biopsie.",
        statut: "resultat",
        envoyee_le: jours(-18),
        cree_le: jours(-18),
      },
      financement: {
        id: "fin-1",
        orientation_id: "ori-1",
        ong_id: "ong-a",
        montant: 65000,
        statut: "confirmee",
        raison_refus: null,
        cree_le: jours(-18),
      },
      suivis: [
        {
          id: "sui-1",
          orientation_id: "ori-1",
          etape: "recue",
          resultat: "en_attente",
          note: "Patiente arrivée accompagnée de son mari.",
          auteur_id: "pro-centre-bogodogo",
          cree_le: jours(-14),
        },
        {
          id: "sui-2",
          orientation_id: "ori-1",
          etape: "examens",
          resultat: "en_attente",
          note: "Échographie et biopsie réalisées le même jour.",
          auteur_id: "pro-centre-bogodogo",
          cree_le: jours(-13),
        },
        {
          id: "sui-3",
          orientation_id: "ori-1",
          etape: "resultat",
          resultat: "cancer_confirme",
          note: "Prise en charge démarrée en oncologie.",
          auteur_id: "pro-centre-bogodogo",
          cree_le: jours(-6),
        },
      ],
    },
    {
      patiente: {
        id: "pat-2",
        code: code(),
        agent_id: "pro-agent-saaba",
        nom: "Korotimi Zoungrana",
        age: 36,
        district_id: "dis-saaba",
        village: "Wayalguin",
        telephone: "76445566",
        capacite_paiement: "partielle",
        consentement: true,
        cree_le: jours(-11),
      },
      consultation: {
        id: "con-2",
        patiente_id: "pat-2",
        agent_id: "pro-agent-saaba",
        recit:
          "Elle décrit une petite boule au sein gauche depuis trois semaines, qui roule sous les doigts et ne fait pas mal.",
        fiche: fiche({
          sein: "gauche",
          masse: true,
          masse_dure: false,
          masse_fixe: false,
          duree_semaines: 3,
          douleur: "aucune",
        }),
        niveau_propose: "orange",
        regles_declenchees: ["O1"],
        explication:
          "Une masse est présente dans le sein gauche. Ce signe demande un examen par un spécialiste, sans urgence immédiate.",
        niveau_valide: "orange",
        raison_correction: null,
        commentaire_correction: null,
        statut: "validee",
        cree_le: jours(-11),
      },
      orientation: {
        id: "ori-2",
        consultation_id: "con-2",
        centre_id: "cen-yalgado",
        creneau_id: "cre-historique-2",
        score: 76.1,
        resume_ia:
          "Patiente de 36 ans. Masse mobile du sein gauche depuis 3 semaines, indolore. Pas de signe cutané ni de ganglion. Orientation pour échographie mammaire.",
        statut: "examens",
        envoyee_le: jours(-11),
        cree_le: jours(-11),
      },
      financement: {
        id: "fin-2",
        orientation_id: "ori-2",
        ong_id: "ong-b",
        montant: 15000,
        statut: "confirmee",
        raison_refus: null,
        cree_le: jours(-11),
      },
      suivis: [
        {
          id: "sui-4",
          orientation_id: "ori-2",
          etape: "recue",
          resultat: "en_attente",
          note: null,
          auteur_id: "pro-centre-yalgado",
          cree_le: jours(-4),
        },
        {
          id: "sui-5",
          orientation_id: "ori-2",
          etape: "examens",
          resultat: "en_attente",
          note: "Échographie faite, résultat attendu.",
          auteur_id: "pro-centre-yalgado",
          cree_le: jours(-3),
        },
      ],
    },
    {
      patiente: {
        id: "pat-3",
        code: code(),
        agent_id: "pro-agent-ziniare",
        nom: "Assétou Ouattara",
        age: 52,
        district_id: "dis-ziniare",
        village: "Ziniaré secteur 3",
        telephone: "78990011",
        capacite_paiement: "ne_peut_pas",
        consentement: true,
        cree_le: jours(-7),
      },
      consultation: {
        id: "con-3",
        patiente_id: "pat-3",
        agent_id: "pro-agent-ziniare",
        recit:
          "Elle a un écoulement avec du sang au mamelon droit depuis deux semaines, un seul côté, pas de boule sentie.",
        fiche: fiche({
          sein: "droit",
          masse: false,
          duree_semaines: 2,
          douleur: "aucune",
          ecoulement: "sanglant",
          ecoulement_un_cote: true,
        }),
        niveau_propose: "rouge",
        regles_declenchees: ["R3"],
        explication:
          "Un écoulement contenant du sang d'un seul côté demande un avis spécialisé rapide.",
        niveau_valide: "rouge",
        raison_correction: null,
        commentaire_correction: null,
        statut: "validee",
        cree_le: jours(-7),
      },
      orientation: {
        id: "ori-3",
        consultation_id: "con-3",
        centre_id: "cen-tengandogo",
        creneau_id: "cre-historique-3",
        score: 71.8,
        resume_ia:
          "Patiente de 52 ans. Écoulement mamelonnaire sanglant unilatéral droit depuis 2 semaines. Pas de masse palpée. Orientation pour échographie et biopsie.",
        statut: "recue",
        envoyee_le: jours(-7),
        cree_le: jours(-7),
      },
      financement: {
        id: "fin-3",
        orientation_id: "ori-3",
        ong_id: "ong-b",
        montant: 65000,
        statut: "confirmee",
        raison_refus: null,
        cree_le: jours(-7),
      },
      suivis: [
        {
          id: "sui-6",
          orientation_id: "ori-3",
          etape: "recue",
          resultat: "en_attente",
          note: null,
          auteur_id: "pro-centre-tengandogo",
          cree_le: jours(-1),
        },
      ],
    },
    {
      patiente: {
        id: "pat-4",
        code: code(),
        agent_id: "pro-agent-koubri",
        nom: "Nafissatou Dicko",
        age: 44,
        district_id: "dis-koubri",
        village: "Koubri centre",
        telephone: "71223344",
        capacite_paiement: "ne_peut_pas",
        consentement: true,
        cree_le: jours(-5),
      },
      consultation: {
        id: "con-4",
        patiente_id: "pat-4",
        agent_id: "pro-agent-koubri",
        recit:
          "Boule au sein gauche depuis deux mois avec un ganglion sous l'aisselle du même côté.",
        fiche: fiche({
          sein: "gauche",
          masse: true,
          duree_semaines: 8,
          douleur: "localisee",
          ganglion_aisselle: true,
        }),
        niveau_propose: "rouge",
        regles_declenchees: ["R2", "R5", "O1", "O5"],
        explication:
          "Une masse accompagnée d'un ganglion sous l'aisselle demande un avis spécialisé dans les sept jours.",
        niveau_valide: "rouge",
        raison_correction: null,
        commentaire_correction: null,
        statut: "validee",
        cree_le: jours(-5),
      },
      orientation: {
        id: "ori-4",
        consultation_id: "con-4",
        centre_id: "cen-tengandogo",
        creneau_id: "cre-historique-4",
        score: 79.3,
        resume_ia:
          "Patiente de 44 ans. Masse du sein gauche depuis 8 semaines, douleur localisée, ganglion axillaire homolatéral. Orientation pour échographie et biopsie.",
        statut: "envoyee",
        envoyee_le: jours(-5),
        cree_le: jours(-5),
      },
      financement: {
        id: "fin-4",
        orientation_id: "ori-4",
        ong_id: "ong-a",
        montant: 65000,
        statut: "confirmee",
        raison_refus: null,
        cree_le: jours(-5),
      },
    },
    {
      patiente: {
        id: "pat-5",
        code: code(),
        agent_id: "pro-agent-koubri",
        nom: "Djeneba Traoré",
        age: 31,
        district_id: "dis-koubri",
        village: "Sondogo",
        telephone: "75667788",
        capacite_paiement: "partielle",
        consentement: true,
        cree_le: jours(-3),
      },
      consultation: {
        id: "con-5",
        patiente_id: "pat-5",
        agent_id: "pro-agent-koubri",
        recit:
          "Le mamelon gauche est rentré depuis environ un mois, elle n'avait pas cela avant. Pas de boule sentie.",
        fiche: fiche({
          sein: "gauche",
          masse: false,
          duree_semaines: 4,
          douleur: "aucune",
          mamelon_retraction_recente: true,
        }),
        niveau_propose: "orange",
        regles_declenchees: ["O2"],
        explication:
          "Un mamelon rentré depuis peu demande un examen par un spécialiste dans le mois.",
        niveau_valide: "orange",
        raison_correction: null,
        commentaire_correction: null,
        statut: "validee",
        cree_le: jours(-3),
      },
      orientation: {
        id: "ori-5",
        consultation_id: "con-5",
        centre_id: "cen-bogodogo",
        creneau_id: "cre-historique-5",
        score: 80.2,
        resume_ia:
          "Patiente de 31 ans. Rétraction récente du mamelon gauche depuis 4 semaines. Pas de masse palpée. Orientation pour échographie mammaire.",
        statut: "envoyee",
        envoyee_le: jours(-3),
        cree_le: jours(-3),
      },
      financement: {
        id: "fin-5",
        orientation_id: "ori-5",
        ong_id: "ong-b",
        montant: 15000,
        statut: "proposee",
        raison_refus: null,
        cree_le: jours(-3),
      },
    },
    {
      patiente: {
        id: "pat-6",
        code: code(),
        agent_id: "pro-agent-ziniare",
        nom: "Rakiéta Yaméogo",
        age: 29,
        district_id: "dis-ziniare",
        village: "Doulougou",
        telephone: "",
        capacite_paiement: "peut_payer",
        consentement: true,
        cree_le: jours(-9),
      },
      consultation: {
        id: "con-6",
        patiente_id: "pat-6",
        agent_id: "pro-agent-ziniare",
        recit:
          "Elle a mal aux deux seins quelques jours avant ses règles, chaque mois. Aucune boule sentie.",
        fiche: fiche({
          sein: "les_deux",
          masse: false,
          duree_semaines: 24,
          douleur: "deux_seins_cyclique",
        }),
        niveau_propose: "vert",
        regles_declenchees: ["V1"],
        explication:
          "Une douleur des deux seins liée au cycle est fréquente et ne présente pas de signe d'alerte. Une surveillance suffit.",
        niveau_valide: "vert",
        raison_correction: null,
        commentaire_correction: null,
        statut: "close",
        cree_le: jours(-9),
      },
    },
    {
      patiente: {
        id: "pat-7",
        code: code(),
        agent_id: "pro-agent-saaba",
        nom: "Alizeta Kinda",
        age: 58,
        district_id: "dis-loumbila",
        village: "Loumbila",
        telephone: "70556677",
        capacite_paiement: "ne_peut_pas",
        consentement: true,
        cree_le: jours(-21),
      },
      consultation: {
        id: "con-7",
        patiente_id: "pat-7",
        agent_id: "pro-agent-saaba",
        recit:
          "Boule au sein droit depuis six semaines, la peau au-dessus est tirée vers l'intérieur.",
        fiche: fiche({
          sein: "droit",
          masse: true,
          duree_semaines: 6,
          douleur: "aucune",
          peau: ["retraction"],
        }),
        niveau_propose: "rouge",
        regles_declenchees: ["R1", "R5", "O1", "O4"],
        explication:
          "Une masse associée à une peau tirée demande un avis spécialisé dans les sept jours.",
        niveau_valide: "rouge",
        raison_correction: null,
        commentaire_correction: null,
        statut: "validee",
        cree_le: jours(-21),
      },
      orientation: {
        id: "ori-7",
        consultation_id: "con-7",
        centre_id: "cen-yalgado",
        creneau_id: "cre-historique-7",
        score: 74.6,
        resume_ia:
          "Patiente de 58 ans. Masse du sein droit depuis 6 semaines avec rétraction cutanée en regard. Orientation pour échographie et biopsie.",
        statut: "resultat",
        envoyee_le: jours(-21),
        cree_le: jours(-21),
      },
      financement: {
        id: "fin-7",
        orientation_id: "ori-7",
        ong_id: "ong-b",
        montant: 65000,
        statut: "confirmee",
        raison_refus: null,
        cree_le: jours(-21),
      },
      suivis: [
        {
          id: "sui-7",
          orientation_id: "ori-7",
          etape: "recue",
          resultat: "en_attente",
          note: null,
          auteur_id: "pro-centre-yalgado",
          cree_le: jours(-17),
        },
        {
          id: "sui-8",
          orientation_id: "ori-7",
          etape: "resultat",
          resultat: "a_surveiller",
          note: "Lésion bénigne probable, contrôle prévu dans six mois.",
          auteur_id: "pro-centre-yalgado",
          cree_le: jours(-10),
        },
      ],
    },
    {
      patiente: {
        id: "pat-8",
        code: code(),
        agent_id: "pro-agent-ziniare",
        nom: "Safiatou Congo",
        age: 39,
        district_id: "dis-ziniare",
        village: "Guiloungou",
        telephone: "76778899",
        capacite_paiement: "partielle",
        consentement: true,
        cree_le: jours(-13),
      },
      consultation: {
        id: "con-8",
        patiente_id: "pat-8",
        agent_id: "pro-agent-ziniare",
        recit:
          "Boule au sein droit depuis cinq semaines, un peu douloureuse à un endroit précis.",
        fiche: fiche({
          sein: "droit",
          masse: true,
          duree_semaines: 5,
          douleur: "localisee",
        }),
        niveau_propose: "rouge",
        regles_declenchees: ["R5", "O1", "O5"],
        explication:
          "Une masse présente depuis plus de quatre semaines après 30 ans demande un avis spécialisé rapide.",
        niveau_valide: "rouge",
        raison_correction: null,
        commentaire_correction: null,
        statut: "validee",
        cree_le: jours(-13),
      },
      orientation: {
        id: "ori-8",
        consultation_id: "con-8",
        centre_id: "cen-tengandogo",
        creneau_id: "cre-historique-8",
        score: 68.9,
        resume_ia:
          "Patiente de 39 ans. Masse du sein droit depuis 5 semaines, douleur localisée. Orientation pour échographie et biopsie.",
        statut: "absente",
        envoyee_le: jours(-13),
        cree_le: jours(-13),
      },
      financement: {
        id: "fin-8",
        orientation_id: "ori-8",
        ong_id: "ong-b",
        montant: 32500,
        statut: "confirmee",
        raison_refus: null,
        cree_le: jours(-13),
      },
      suivis: [
        {
          id: "sui-9",
          orientation_id: "ori-8",
          etape: "absente",
          resultat: "en_attente",
          note: "La patiente ne s'est pas présentée au rendez-vous.",
          auteur_id: "pro-centre-tengandogo",
          cree_le: jours(-4),
        },
      ],
    },
  ];
}

/** Créneaux figés des dossiers de l'historique (déjà réservés). */
export function creneauxHistorique(): Creneau[] {
  return [
    { id: "cre-historique-1", centre_id: "cen-bogodogo", debut: jours(-14, 8), libre: false },
    { id: "cre-historique-2", centre_id: "cen-yalgado", debut: jours(-4, 10), libre: false },
    { id: "cre-historique-3", centre_id: "cen-tengandogo", debut: jours(-1, 8), libre: false },
    { id: "cre-historique-4", centre_id: "cen-tengandogo", debut: jours(1, 14), libre: false },
    { id: "cre-historique-5", centre_id: "cen-bogodogo", debut: jours(12, 10), libre: false },
    { id: "cre-historique-7", centre_id: "cen-yalgado", debut: jours(-17, 8), libre: false },
    { id: "cre-historique-8", centre_id: "cen-tengandogo", debut: jours(-6, 10), libre: false },
  ];
}
