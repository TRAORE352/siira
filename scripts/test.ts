// Vérifie les règles de classement et le matching sur les cas de démo
// (section 14.2 du cahier des charges). Lancer avec : npx tsx scripts/test.ts
import assert from "node:assert/strict";
import { classer } from "../lib/regles";
import { calculerMatching } from "../lib/matching";
import type { CentreAvecCreneaux } from "../lib/matching";
import {
  contributionOng,
  montantDemande,
  regleCorrespond,
} from "../lib/financement";
import { trouverCasDemo } from "../lib/cache-demo";
import type { FicheStructuree, RegleFinancement, Tarif } from "../lib/types";

let echecs = 0;

function verifier(nom: string, reel: unknown, attendu: unknown) {
  try {
    assert.deepStrictEqual(reel, attendu);
    console.log(`  ✓ ${nom}`);
  } catch {
    echecs++;
    console.error(`  ✗ ${nom}`);
    console.error(`    attendu : ${JSON.stringify(attendu)}`);
    console.error(`    obtenu  : ${JSON.stringify(reel)}`);
  }
}

// ---------------------------------------------------------------------------
// Règles de classement (section 6.1)
// ---------------------------------------------------------------------------
console.log("Règles de classement :");

// Awa, 41 ans — « boule au sein gauche depuis deux mois, peau un peu tirée »
const awa: FicheStructuree = {
  sein: "gauche",
  masse: true,
  masse_dure: null,
  masse_fixe: null,
  duree_semaines: 8,
  douleur: "aucune",
  peau: ["retraction"],
  mamelon_retraction_recente: null,
  ecoulement: null,
  ecoulement_un_cote: null,
  ganglion_aisselle: null,
  antecedents_familiaux: null,
  autres: null,
};
verifier(
  "Awa → rouge (R1, R5)",
  classer(awa, 41),
  { niveau: "rouge", regles: ["R1", "R5"], masseManquante: false },
);

// Aminata, 34 ans — « petite boule au sein droit depuis une semaine, elle bouge »
const aminata: FicheStructuree = {
  sein: "droit",
  masse: true,
  masse_dure: null,
  masse_fixe: false,
  duree_semaines: 1,
  douleur: null,
  peau: [],
  mamelon_retraction_recente: null,
  ecoulement: null,
  ecoulement_un_cote: null,
  ganglion_aisselle: null,
  antecedents_familiaux: null,
  autres: null,
};
verifier(
  "Aminata → orange (O1)",
  classer(aminata, 34),
  { niveau: "orange", regles: ["O1"], masseManquante: false },
);

// Fatou, 28 ans — « mal aux deux seins avant ses règles, pas de boule »
const fatou: FicheStructuree = {
  sein: "les_deux",
  masse: false,
  masse_dure: null,
  masse_fixe: null,
  duree_semaines: null,
  douleur: "deux_seins_cyclique",
  peau: [],
  mamelon_retraction_recente: null,
  ecoulement: null,
  ecoulement_un_cote: null,
  ganglion_aisselle: null,
  antecedents_familiaux: null,
  autres: null,
};
verifier(
  "Fatou → vert (V1)",
  classer(fatou, 28),
  { niveau: "vert", regles: ["V1"], masseManquante: false },
);

// Masse inconnue → orange au minimum, sans règle précise.
const masseInconnue: FicheStructuree = { ...fatou, masse: null };
verifier(
  "Masse inconnue → orange (masseManquante)",
  classer(masseInconnue, 40),
  { niveau: "orange", regles: [], masseManquante: true },
);

// ---------------------------------------------------------------------------
// Matching (section 6.2)
// ---------------------------------------------------------------------------
console.log("Matching :");

const maintenant = new Date("2026-10-15T09:00:00Z");

const centres: CentreAvecCreneaux[] = [
  {
    id: "c1",
    nom: "CHU de Bogodogo",
    service: "Oncologie",
    latitude: 12.36,
    longitude: -1.5,
    examens: ["echographie", "biopsie", "mammographie"],
    placesSemaine: 10,
    actif: true,
    creneaux: [
      { id: "cr1", centreId: "c1", debut: "2026-10-16T10:00:00Z", libre: true },
      { id: "cr2", centreId: "c1", debut: "2026-10-17T10:00:00Z", libre: true },
    ],
  },
  {
    id: "c2",
    nom: "CHR de Ziniaré",
    service: "Oncologie",
    latitude: 12.58,
    longitude: -1.3,
    examens: ["echographie", "biopsie"],
    placesSemaine: 5,
    actif: true,
    creneaux: [
      { id: "cr3", centreId: "c2", debut: "2026-10-20T10:00:00Z", libre: true },
    ],
  },
  {
    id: "c3",
    nom: "Clinique sans biopsie",
    latitude: 12.36,
    longitude: -1.49,
    examens: ["echographie"],
    placesSemaine: 8,
    actif: true,
    creneaux: [
      { id: "cr4", centreId: "c3", debut: "2026-10-16T08:00:00Z", libre: true },
    ],
  },
];

const patienteSaaba = { latitude: 12.37, longitude: -1.52 };

const rouge = calculerMatching(centres, patienteSaaba, "rouge", maintenant);
verifier("rouge : le centre sans biopsie est exclu", rouge.tous.length, 2);
verifier(
  "rouge : le plus proche (Bogodogo) gagne",
  rouge.meilleur?.centre.id,
  "c1",
);
verifier("rouge : pas de mode secours", rouge.aucunCentreDansLeDelai, false);

const orange = calculerMatching(centres, patienteSaaba, "orange", maintenant);
verifier("orange : la clinique (écho) est désormais retenue", orange.tous.length, 3);

// Aucun centre dans le délai → secours = le plus proche.
const centresTardifs: CentreAvecCreneaux[] = centres.map((c) => ({
  ...c,
  creneaux: c.creneaux.map((cr) => ({
    ...cr,
    debut: "2026-11-15T10:00:00Z",
  })),
}));
const horsDelai = calculerMatching(centresTardifs, patienteSaaba, "rouge", maintenant);
verifier("hors délai : aucun centre retenu", horsDelai.aucunCentreDansLeDelai, true);
verifier(
  "hors délai : secours = le plus proche (Bogodogo)",
  horsDelai.secours?.centre.id,
  "c1",
);

// ---------------------------------------------------------------------------
// Financement (section 6.3)
// ---------------------------------------------------------------------------
console.log("Financement :");

const tarifs: Tarif[] = [
  { centreId: "c1", soin: "consultation", montant: 5000 },
  { centreId: "c1", soin: "echographie", montant: 15000 },
  { centreId: "c1", soin: "biopsie", montant: 40000 },
  { centreId: "c1", soin: "transport", montant: 10000 },
];

verifier("montant orange = 30 000 FCFA", montantDemande("orange", tarifs), 30000);
verifier("montant rouge = 70 000 FCFA", montantDemande("rouge", tarifs), 70000);
verifier("contribution ne_peut_pas = total", contributionOng("ne_peut_pas", 70000), 70000);
verifier("contribution partielle = moitié", contributionOng("partielle", 70000), 35000);

const regle: RegleFinancement = {
  id: "r1",
  ongId: "ong1",
  districts: ["d1", "d3"],
  niveaux: ["rouge"],
  situations: ["partielle", "ne_peut_pas"],
  active: true,
};

verifier(
  "règle correspond (rouge, Saaba, ne peut pas payer)",
  regleCorrespond(regle, { districtId: "d1", niveau: "rouge", capacitePaiement: "ne_peut_pas" }, 100000, 70000),
  true,
);
verifier(
  "peut_payer → jamais financé",
  regleCorrespond(regle, { districtId: "d1", niveau: "rouge", capacitePaiement: "peut_payer" }, 100000, 70000),
  false,
);
verifier(
  "district hors règle → exclu",
  regleCorrespond(regle, { districtId: "d2", niveau: "rouge", capacitePaiement: "ne_peut_pas" }, 100000, 70000),
  false,
);
verifier(
  "niveau orange non couvert (règle rouge) → exclu",
  regleCorrespond(regle, { districtId: "d1", niveau: "orange", capacitePaiement: "ne_peut_pas" }, 100000, 70000),
  false,
);
verifier(
  "budget insuffisant → exclu",
  regleCorrespond(regle, { districtId: "d1", niveau: "rouge", capacitePaiement: "ne_peut_pas" }, 60000, 70000),
  false,
);
verifier(
  "partielle : budget = moitié suffit",
  regleCorrespond(regle, { districtId: "d1", niveau: "rouge", capacitePaiement: "partielle" }, 35000, 70000),
  true,
);
verifier(
  "règle inactive → exclue",
  regleCorrespond({ ...regle, active: false }, { districtId: "d1", niveau: "rouge", capacitePaiement: "ne_peut_pas" }, 100000, 70000),
  false,
);

// ---------------------------------------------------------------------------
// Cache de démo (section 8.4)
// ---------------------------------------------------------------------------
console.log("Cache de démo :");
verifier(
  "récit d'Awa reconnu",
  trouverCasDemo("Elle a une boule au sein gauche depuis deux mois, ça ne fait pas mal, la peau est un peu tirée.")?.slug,
  "awa",
);
verifier("récit sans rapport → null", trouverCasDemo("texte quelconque sans rapport"), null);

console.log("");
if (echecs > 0) {
  console.error(`${echecs} test(s) en échec.`);
  process.exit(1);
}
console.log("Tous les tests passent.");
