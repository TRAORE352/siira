// Appels à l'API DeepSeek (section 8 du cahier des charges).
// Appelé UNIQUEMENT depuis les routes API du serveur. La clé n'est jamais
// exposée au client (jamais de préfixe NEXT_PUBLIC_).

import type { FicheStructuree, Niveau } from "./types";

const BASE_URL = "https://api.deepseek.com";
const MODELE = "deepseek-chat";
const TIMEOUT_MS = 15_000; // section 8.4 : arrêt au-delà de 15 s

// Format de la fiche structurée (section 8.2), joint au message d'extraction.
const FORMAT_FICHE = `{
  "sein": "gauche" | "droit" | "les_deux" | null,
  "masse": true | false | null,
  "masse_dure": true | false | null,
  "masse_fixe": true | false | null,
  "duree_semaines": entier >= 0 | null (\"deux mois\" = 8),
  "douleur": "aucune" | "localisee" | "deux_seins_cyclique" | null,
  "peau": liste parmi ["retraction","peau_orange","ulceration","rougeur"] (vide si rien),
  "mamelon_retraction_recente": true | false | null,
  "ecoulement": "aucun" | "sanglant" | "non_sanglant" | null,
  "ecoulement_un_cote": true | false | null,
  "ganglion_aisselle": true | false | null,
  "antecedents_familiaux": true | false | null,
  "autres": texte | null
}`;

const SYSTEM_EXTRACTION = `Tu es un assistant qui transforme le récit d'un agent de santé en fiche structurée. Réponds uniquement avec un objet JSON conforme au format fourni. Si une information n'est pas dite clairement, mets null. Ne déduis rien, ne pose aucun diagnostic.

Format attendu :
${FORMAT_FICHE}`;

const SYSTEM_EXPLICATION = `Explique en 2 ou 3 phrases simples, en français, pourquoi ce niveau d'urgence a été proposé, à partir des règles fournies. N'emploie jamais les mots cancer confirmé ou diagnostic. Ne donne aucun traitement.`;

const SYSTEM_RESUME = `Rédige pour un médecin spécialiste un résumé factuel de 4 lignes maximum à partir de la fiche fournie. Pas d'hypothèse diagnostique.`;

interface Message {
  role: "system" | "user";
  content: string;
}

async function apiKey(): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY non définie");
  return key;
}

/** Appel unique avec délai maximum ; lève une erreur en cas de timeout. */
async function appeler(
  messages: Message[],
  temperature: number,
  jsonObject = false,
): Promise<string> {
  const key = await apiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const reponse = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODELE,
        messages,
        temperature,
        ...(jsonObject ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => "");
      throw new Error(`DeepSeek HTTP ${reponse.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await reponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const contenu = data.choices?.[0]?.message?.content;
    if (!contenu) throw new Error("Réponse DeepSeek vide");
    return contenu;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("L'analyse prend trop de temps");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function estFicheValide(v: unknown): v is FicheStructuree {
  if (typeof v !== "object" || v === null) return false;
  const f = v as Record<string, unknown>;
  // Les champs booléens/nuls doivent être booléens, null ou absents.
  const bools = [
    "masse",
    "masse_dure",
    "masse_fixe",
    "mamelon_retraction_recente",
    "ecoulement_un_cote",
    "ganglion_aisselle",
    "antecedents_familiaux",
  ];
  for (const b of bools) {
    if (f[b] !== null && f[b] !== undefined && typeof f[b] !== "boolean") {
      return false;
    }
  }
  if (f.duree_semaines !== null && f.duree_semaines !== undefined && typeof f.duree_semaines !== "number") {
    return false;
  }
  return true;
}

/** Remplit les valeurs nulles/manquantes de la fiche pour un objet complet. */
function normaliserFiche(v: Partial<FicheStructuree> | null): FicheStructuree {
  const f = v ?? {};
  return {
    sein: f.sein ?? null,
    masse: f.masse ?? null,
    masse_dure: f.masse_dure ?? null,
    masse_fixe: f.masse_fixe ?? null,
    duree_semaines: f.duree_semaines ?? null,
    douleur: f.douleur ?? null,
    peau: f.peau ?? [],
    mamelon_retraction_recente: f.mamelon_retraction_recente ?? null,
    ecoulement: f.ecoulement ?? null,
    ecoulement_un_cote: f.ecoulement_un_cote ?? null,
    ganglion_aisselle: f.ganglion_aisselle ?? null,
    antecedents_familiaux: f.antecedents_familiaux ?? null,
    autres: f.autres ?? null,
  };
}

/** Remplace le nom de la patiente par « la patiente » avant tout envoi. */
export function anonymiserRecit(recit: string, nomPatiente: string | null): string {
  if (!nomPatiente) return recit;
  const parties = nomPatiente.split(/\s+/).filter((p) => p.length > 2);
  let resultat = recit;
  for (const p of parties) {
    resultat = resultat.split(p).join("la patiente");
  }
  return resultat;
}

/**
 * Extraction : récit -> fiche structurée JSON (section 8.2).
 * Un second essai automatique en cas de JSON invalide ; sinon renvoie null
 * (l'agent remplit alors la fiche à la main).
 */
export async function extractionFiche(
  recit: string,
): Promise<FicheStructuree | null> {
  for (let tentative = 0; tentative < 2; tentative++) {
    const texte = await appeler(
      [
        { role: "system", content: SYSTEM_EXTRACTION },
        { role: "user", content: recit },
      ],
      0,
      true,
    );
    try {
      const parsed = JSON.parse(texte) as unknown;
      if (estFicheValide(parsed)) return normaliserFiche(parsed as Partial<FicheStructuree>);
    } catch {
      // JSON invalide -> nouvel essai
    }
  }
  return null;
}

/** Explication : 2 ou 3 phrases simples sur le niveau proposé. */
export async function explicationNiveau(
  niveau: Niveau,
  regles: string[],
): Promise<string | null> {
  const texte = await appeler(
    [
      { role: "system", content: SYSTEM_EXPLICATION },
      {
        role: "user",
        content: `Niveau proposé : ${niveau}. Règles déclenchées : ${regles.join(", ")}.`,
      },
    ],
    0.3,
  );
  return texte.trim() || null;
}

/** Résumé : 4 lignes maximum pour le médecin spécialiste. */
export async function resumeSpecialiste(
  fiche: FicheStructuree,
  niveau: Niveau,
): Promise<string | null> {
  const texte = await appeler(
    [
      { role: "system", content: SYSTEM_RESUME },
      {
        role: "user",
        content: `Fiche : ${JSON.stringify(fiche)}\nNiveau validé : ${niveau}.`,
      },
    ],
    0.3,
  );
  return texte.trim() || null;
}
