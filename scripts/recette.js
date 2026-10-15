#!/usr/bin/env node
/**
 * Recette Siira : le parcours complet, dans un vrai navigateur.
 *
 * Trois onglets ouverts en même temps, comme pendant la démonstration :
 * l'agent sur un téléphone, le centre et l'ONG sur ordinateur.
 *
 *  1. l'agent saisit le cas d'Awa  -> niveau rouge attendu (R1, R5)
 *  2. il valide, le centre et la date sont proposés
 *  3. il envoie le dossier         -> il apparaît chez le centre sans recharger
 *  4. la demande apparaît chez l'ONG, sans aucune donnée d'identité
 *  5. l'ONG finance                -> budget et bloc financement mis à jour
 *  6. le centre enregistre la suite -> l'agent et l'impact suivent
 *
 * Usage : node scripts/recette.js [--repetitions 1]
 */

const { chromium } = require("playwright-core");
const fs = require("fs");

const BASE = process.env.BASE || "http://localhost:3100";
const args = process.argv.slice(2);
const lireArg = (nom, defaut) => {
  const i = args.indexOf(`--${nom}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : defaut;
};
const REPETITIONS = Number(lireArg("repetitions", "1"));

function trouverChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const racine = "/root/.cache/ms-playwright";
  for (const d of fs.readdirSync(racine)) {
    for (const nom of ["chrome", "headless_shell"]) {
      const p = `${racine}/${d}/chrome-linux/${nom}`;
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error("Chromium introuvable");
}

const etapes = [];
let echecs = 0;

function verifier(libelle, condition, detail = "") {
  const ok = Boolean(condition);
  if (!ok) echecs += 1;
  etapes.push(`${ok ? "OK  " : "ECHEC"} ${libelle}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

/** Attend qu'une condition devienne vraie, sans dépasser le délai. */
async function attendre(page, fn, { timeout = 5000, message = "" } = {}) {
  const debut = Date.now();
  while (Date.now() - debut < timeout) {
    if (await page.evaluate(fn)) return Date.now() - debut;
    await page.waitForTimeout(100);
  }
  throw new Error(`Délai dépassé : ${message}`);
}

async function connecter(page, email) {
  await page.goto(`${BASE}/connexion`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Comptes de démonstration");
  await page.evaluate((mail) => {
    const profils = {
      "agent.saaba@siira.demo": "pro-agent-saaba",
      "centre.bogodogo@siira.demo": "pro-centre-bogodogo",
      "centre.tengandogo@siira.demo": "pro-centre-tengandogo",
      "centre.yalgado@siira.demo": "pro-centre-yalgado",
      "ong.yennenga@siira.demo": "pro-ong-a",
      "ong.wendpanga@siira.demo": "pro-ong-b",
      "admin@siira.demo": "pro-admin",
    };
    sessionStorage.setItem("siira.session.v1", profils[mail]);
  }, email);
}

/**
 * Préchauffage : en mode développement, Next compile chaque route à la
 * première visite. On les visite toutes une fois avant de chronométrer.
 */
async function prechauffer(navigateur) {
  const contexte = await navigateur.newContext();
  const page = await contexte.newPage();
  await page.goto(`${BASE}/connexion`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() =>
    sessionStorage.setItem("siira.session.v1", "pro-agent-saaba"),
  );
  for (const chemin of [
    "/agent",
    "/agent/consultation/nouvelle",
    "/agent/consultation/con-1/resultat",
    "/agent/consultation/con-1/orientation",
    "/agent/patiente/pat-1",
    "/centre",
    "/centre/dossier/ori-1",
    "/ong",
    "/ong/impact",
    "/admin",
  ]) {
    await page.goto(BASE + chemin, { waitUntil: "domcontentloaded" }).catch(() => {});
  }
  await contexte.close();
}

async function passage(navigateur, numero) {
  etapes.push(`\n--- Passage ${numero} ---`);

  // Un seul navigateur, trois onglets : les données sont partagées entre les
  // onglets, mais chaque onglet a son propre compte connecté.
  const contexte = await navigateur.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const agent = await contexte.newPage();
  await agent.setViewportSize({ width: 360, height: 780 }); // téléphone
  const centre = await contexte.newPage();
  const ong = await contexte.newPage();

  const erreursJs = [];
  for (const [nom, p] of [["agent", agent], ["centre", centre], ["ong", ong]]) {
    p.on("pageerror", (e) => erreursJs.push(`${nom}: ${e.message}`));
    p.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("hydrat"))
        erreursJs.push(`${nom}: ${m.text()}`);
    });
  }

  /* 0. Remise à zéro par l'admin, puis connexion des trois rôles. */
  await connecter(agent, "admin@siira.demo");
  await agent.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await agent.getByRole("button", { name: "Réinitialiser la démo" }).click();
  await agent.getByRole("button", { name: "Oui, tout remettre à zéro" }).click();
  await agent.waitForSelector("text=état de départ");
  verifier("Réinitialisation de la démonstration", true);

  await connecter(agent, "agent.saaba@siira.demo");
  await connecter(centre, "centre.bogodogo@siira.demo");
  await connecter(ong, "ong.yennenga@siira.demo");

  await agent.goto(`${BASE}/agent`, { waitUntil: "domcontentloaded" });
  await agent.waitForSelector("text=Nouvelle consultation");
  verifier("Connexion de l'agent", await agent.isVisible("text=Mes patientes"));

  verifier("Connexion du centre", true);

  await ong.goto(`${BASE}/ong`, { waitUntil: "domcontentloaded" });
  await ong.waitForSelector("text=Demandes de financement");
  const budgetAvant = await ong.evaluate(() => {
    const m = document.body.innerText.match(/Budget restant\s*([\d\s]+)FCFA/);
    return m ? Number(m[1].replace(/\s/g, "")) : null;
  });
  verifier("Connexion de l'ONG", budgetAvant !== null, `budget ${budgetAvant} FCFA`);

  /* 1. Saisie du cas d'Awa. */
  await agent.getByRole("link", { name: "Nouvelle consultation" }).click();
  await agent.waitForSelector('input[type="number"]');

  await agent.fill('input[autocomplete="off"]', "Awa Compaoré");
  await agent.fill('input[type="number"]', "41");
  await agent.selectOption("select", { label: "Saaba" });
  await agent.click("text=Elle ne peut pas payer");
  await agent.fill(
    "textarea",
    "Elle a une boule au sein gauche depuis deux mois, ça ne fait pas mal, la peau est un peu tirée.",
  );

  // Le bouton reste inactif tant que le consentement n'est pas coché.
  const inactifAvantConsentement = await agent.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find((x) =>
      x.textContent.includes("Analyser le cas"),
    );
    return b ? b.disabled : null;
  });
  verifier(
    "Analyse bloquée tant que le consentement n'est pas donné",
    inactifAvantConsentement === true,
  );

  await agent.click('input[type="checkbox"]');
  const debutAnalyse = Date.now();
  await agent.getByRole("button", { name: "Analyser le cas" }).click();
  await agent.waitForURL(/\/resultat$/, { timeout: 15000 });
  await agent.waitForSelector("text=Niveau d'urgence proposé");
  const dureeAnalyse = Date.now() - debutAnalyse;

  const texteResultat = await agent.evaluate(() => document.body.innerText);
  verifier("Niveau rouge proposé", /Rouge/.test(texteResultat));
  verifier(
    "Règle R1 affichée (masse et signe sur la peau)",
    texteResultat.includes("signe sur la peau"),
  );
  verifier(
    "Règle R5 affichée (masse depuis 4 semaines ou plus)",
    texteResultat.includes("4 semaines ou plus"),
  );
  verifier("Délai de 7 jours affiché", texteResultat.includes("7 jours"));
  verifier(
    "Mention « ne pose pas de diagnostic » visible",
    texteResultat.includes("ne pose pas de diagnostic"),
  );
  verifier("Analyse en moins de 10 secondes", dureeAnalyse < 10000, `${dureeAnalyse} ms`);

  /* 2. Validation : centre et date proposés. */
  await agent.getByRole("button", { name: /Continuer vers l'orientation/ }).click();
  await agent.waitForURL(/\/orientation$/);
  await agent.waitForSelector("text=Orientation");
  const texteOrientation = await agent.evaluate(() => document.body.innerText);
  verifier("Un centre est proposé", /CHU|CHR/.test(texteOrientation));
  verifier("Un rendez-vous est proposé", texteOrientation.includes("Rendez-vous"));
  verifier(
    "Examens du niveau rouge demandés",
    texteOrientation.includes("Échographie et biopsie"),
  );
  verifier(
    "Message pour la patiente rédigé",
    texteOrientation.includes("Bonjour Awa"),
  );
  verifier(
    "Les ONG correspondantes sont annoncées",
    /demande sera envoyée à \d+ ONG/.test(texteOrientation),
  );

  /*
   * L'onglet « centre » est ouvert sur le centre réellement retenu par le
   * matching : c'est là que le dossier doit arriver.
   */
  const COMPTE_CENTRE = {
    "CHU de Bogodogo": "centre.bogodogo@siira.demo",
    "CHU de Tengandogo": "centre.tengandogo@siira.demo",
    "CHU Yalgado Ouédraogo": "centre.yalgado@siira.demo",
    "CHR de Ziniaré": "centre.ziniare@siira.demo",
  };
  const nomCentre = Object.keys(COMPTE_CENTRE).find((n) =>
    texteOrientation.includes(n),
  );
  verifier("Le centre retenu est identifié", Boolean(nomCentre), nomCentre || "aucun");

  await connecter(centre, COMPTE_CENTRE[nomCentre]);
  await centre.goto(`${BASE}/centre`, { waitUntil: "domcontentloaded" });
  await centre.waitForSelector("text=Patientes reçues");
  verifier(
    "Awa n'est pas encore chez le centre",
    !(await centre.evaluate(() => document.body.innerText.includes("Awa Compaoré"))),
  );

  /* 3. Envoi du dossier : il doit apparaître chez le centre. */
  const envoi = Date.now();
  await agent.getByRole("button", { name: "Envoyer le dossier" }).click();
  await agent.waitForURL(/\/agent\/patiente\//);

  const delaiCentre = await attendre(
    centre,
    () => document.body.innerText.includes("Awa Compaoré"),
    { message: "le dossier n'est pas arrivé chez le centre" },
  );
  verifier(
    "Le dossier apparaît chez le centre en moins de 3 secondes",
    Date.now() - envoi < 3000,
    `${Date.now() - envoi} ms`,
  );
  verifier("Mise à jour sans recharger la page du centre", delaiCentre >= 0);

  /* 4. La demande arrive chez l'ONG, sans identité. */
  await attendre(ong, () => /Cas \d+/.test(document.body.innerText), {
    message: "la demande n'est pas arrivée chez l'ONG",
  });
  const texteOng = await ong.evaluate(() => document.body.innerText);
  verifier("La demande apparaît chez l'ONG", /Cas \d+/.test(texteOng));
  verifier("Aucun nom de patiente chez l'ONG", !texteOng.includes("Awa"));
  verifier("Aucun village chez l'ONG", !texteOng.includes("Compaoré"));
  verifier("L'âge et le district sont visibles", texteOng.includes("41 ans"));

  /* 5. L'ONG finance. */
  await ong.getByRole("button", { name: "Je finance" }).first().click();
  await ong.waitForSelector("text=Confirmer le financement");
  await ong.getByRole("button", { name: "Confirmer", exact: true }).click();
  await ong.waitForSelector("text=est financé");

  const budgetApres = await ong.evaluate(() => {
    const m = document.body.innerText.match(/Budget restant\s*([\d\s]+)FCFA/);
    return m ? Number(m[1].replace(/\s/g, "")) : null;
  });
  verifier(
    "Le budget de l'ONG a diminué",
    budgetApres !== null && budgetApres < budgetAvant,
    `${budgetAvant} -> ${budgetApres} FCFA`,
  );

  await attendre(
    agent,
    () => document.body.innerText.includes("Soins financés par"),
    { message: "le financement n'est pas remonté chez l'agent" },
  );
  verifier("L'agent voit le financement confirmé", true);

  /* 6. Le centre enregistre la suite donnée. */
  await centre.getByRole("link", { name: "Awa Compaoré" }).first().click();
  await centre.waitForURL(/\/centre\/dossier\//);
  await centre.waitForSelector("text=Enregistrer la suite donnée");

  const texteDossier = await centre.evaluate(() => document.body.innerText);
  verifier("Résumé pour le spécialiste présent", texteDossier.includes("Résumé"));
  verifier("Récit original visible", texteDossier.includes("boule au sein gauche"));
  verifier("Agent d'origine visible", texteDossier.includes("Salimata"));

  await centre.selectOption("select", { label: "Patiente reçue" });
  await centre.getByRole("button", { name: "Enregistrer" }).click();
  await centre.waitForSelector("text=est enregistrée");

  await attendre(
    agent,
    () => document.body.innerText.includes("Patiente reçue"),
    { message: "l'étape « reçue » n'est pas remontée chez l'agent" },
  );
  verifier("L'agent voit « patiente reçue »", true);

  await centre.selectOption("select >> nth=0", { label: "Résultat disponible" });
  await centre.selectOption("select >> nth=1", { label: "Cancer confirmé" });
  await centre.getByRole("button", { name: "Enregistrer" }).click();
  await centre.waitForSelector("text=est enregistrée");

  await attendre(
    agent,
    () => document.body.innerText.includes("Résultat disponible"),
    { message: "le résultat n'est pas remonté chez l'agent" },
  );
  verifier("L'agent voit le résultat", true);

  /* 7. Le tableau d'impact de l'ONG a bougé. */
  await ong.goto(`${BASE}/ong/impact`, { waitUntil: "domcontentloaded" });
  await ong.waitForSelector("text=Femmes financées");
  const texteImpact = await ong.evaluate(() => document.body.innerText);
  const femmes = Number((texteImpact.match(/Femmes financées\s*(\d+)/) || [])[1]);
  const resultats = Number((texteImpact.match(/Résultats connus\s*(\d+)/) || [])[1]);
  verifier("Le tableau d'impact compte la femme financée", femmes >= 1, `${femmes}`);
  verifier("Le résultat connu est compté", resultats >= 1, `${resultats}`);

  verifier(
    "Aucune erreur dans la console",
    erreursJs.length === 0,
    erreursJs.slice(0, 3).join(" | "),
  );

  await contexte.close();
}

(async () => {
  const navigateur = await chromium.launch({
    executablePath: trouverChrome(),
    args: ["--no-sandbox"],
  });

  try {
    await prechauffer(navigateur);
    for (let i = 1; i <= REPETITIONS; i += 1) {
      await passage(navigateur, i);
    }
  } catch (e) {
    echecs += 1;
    etapes.push(`ECHEC interruption — ${e.message}`);
  } finally {
    await navigateur.close();
  }

  console.log(etapes.join("\n"));
  console.log(
    `\n${echecs === 0 ? "RECETTE REUSSIE" : `RECETTE EN ECHEC (${echecs})`} — ${
      etapes.filter((e) => e.startsWith("OK")).length
    } vérifications passées`,
  );
  process.exit(echecs === 0 ? 0 : 1);
})();
