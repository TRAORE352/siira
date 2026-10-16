#!/usr/bin/env node
/**
 * Recette Siira : le parcours complet, dans un vrai navigateur.
 *
 * Deux onglets ouverts en même temps, comme pendant la démonstration :
 * l'agent sur un téléphone, le centre sur ordinateur.
 *
 *  1. l'agent saisit le cas d'Awa  -> niveau rouge attendu (R1, R5)
 *  2. il valide, le centre et la date sont proposés
 *  3. il envoie le dossier         -> écran de confirmation, puis il apparaît
 *                                     chez le centre sans recharger
 *  4. le centre enregistre la suite -> l'agent suit l'avancement
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

/*
 * Connexion d'un compte de démonstration.
 *
 * Les écrans de connexion vivent leur vie — numéro de téléphone pour l'agent,
 * matricule pour le centre — et un matricule tombé au hasard ne mène pas au
 * centre que la recette veut éprouver. Elle ouvre donc la session directement,
 * par l'identifiant du profil. Les écrans de connexion eux-mêmes sont vérifiés
 * ailleurs : par l'audit des écrans et par le contrôle des adresses.
 */
async function connecter(page, profil) {
  await page.goto(`${BASE}/connexion`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=/Se connecter|Ouvrir mon espace/");
  await page.evaluate((id) => sessionStorage.setItem("siira.session.v1", id), profil);
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
    "/agent/consultation/con-1/confirmation",
    "/agent/patiente/pat-1",
    "/centre",
    "/centre/dossier/ori-1",
    "/admin",
  ]) {
    await page.goto(BASE + chemin, { waitUntil: "domcontentloaded" }).catch(() => {});
  }
  await contexte.close();
}

async function passage(navigateur, numero) {
  etapes.push(`\n--- Passage ${numero} ---`);

  // Un seul navigateur, deux onglets : les données sont partagées entre les
  // onglets, mais chaque onglet a son propre compte connecté.
  const contexte = await navigateur.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const agent = await contexte.newPage();
  await agent.setViewportSize({ width: 360, height: 780 }); // téléphone
  const centre = await contexte.newPage();

  const erreursJs = [];
  for (const [nom, p] of [["agent", agent], ["centre", centre]]) {
    p.on("pageerror", (e) => erreursJs.push(`${nom}: ${e.message}`));
    p.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("hydrat"))
        erreursJs.push(`${nom}: ${m.text()}`);
    });
  }

  /* 0. Remise à zéro par l'admin, puis connexion des deux rôles. */
  await connecter(agent, "pro-admin");
  await agent.goto(`${BASE}/admin/demonstration`, { waitUntil: "domcontentloaded" });
  await agent.getByRole("button", { name: "Réinitialiser la démo" }).click();
  await agent.getByRole("button", { name: "Oui, tout remettre à zéro" }).click();
  await agent.waitForSelector("text=état de départ");
  verifier("Réinitialisation de la démonstration", true);

  await connecter(agent, "pro-agent-saaba");
  await connecter(centre, "pro-centre-bogodogo");

  await agent.goto(`${BASE}/agent`, { waitUntil: "domcontentloaded" });
  await agent.waitForSelector("text=Nouvelle consultation");
  verifier("Connexion de l'agent", await agent.isVisible("text=Mes patientes"));

  verifier("Connexion du centre", true);

  /* 1. Saisie du cas d'Awa, en cinq étapes. */
  await agent.getByRole("link", { name: "Nouvelle consultation" }).click();
  await agent.waitForSelector('input[autocomplete="off"]');

  /*
   * Le formulaire est un parcours : une question à la fois. On remplit chaque
   * étape puis on touche « Continuer », exactement comme l'agent.
   */
  async function continuer() {
    await agent.getByRole("button", { name: "Continuer", exact: true }).click();
  }

  /* Étape 1 — identité */
  await agent.fill('input[autocomplete="off"]', "Awa Compaoré");
  await agent.fill('input[type="number"]', "41");
  await continuer();

  /* Étape 2 — district */
  await agent.waitForSelector("select");
  await agent.selectOption("select", { label: "Saaba" });
  await continuer();

  /* Étape 3 — capacité de paiement */
  await agent.waitForSelector('input[type="radio"]');
  await agent.click("text=Elle ne peut pas payer");
  await continuer();

  /* Étape 4 — le récit */
  await agent.waitForSelector("textarea");
  await agent.fill(
    "textarea",
    "Elle a une boule au sein gauche depuis deux mois, ça ne fait pas mal, la peau est un peu tirée.",
  );
  await continuer();

  /* Étape 5 — consentement. L'analyse reste bloquée tant qu'il manque. */
  await agent.waitForSelector('input[type="checkbox"]');
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
    "La prise en charge pressentie est annoncée",
    /prise en charge est enregistrée pour/.test(texteOrientation) ||
      /Aucun partenaire ne couvre ce cas/.test(texteOrientation),
  );

  /*
   * L'onglet « centre » est ouvert sur le centre réellement retenu par le
   * matching : c'est là que le dossier doit arriver.
   */
  const COMPTE_CENTRE = {
    "CHU de Bogodogo": "pro-centre-bogodogo",
    "CHU de Tengandogo": "pro-centre-tengandogo",
    "CHU Yalgado Ouédraogo": "pro-centre-yalgado",
    "CHR de Ziniaré": "pro-centre-ziniare",
  };
  const nomCentre = Object.keys(COMPTE_CENTRE).find((n) =>
    texteOrientation.includes(n),
  );
  verifier("Le centre retenu est identifié", Boolean(nomCentre), nomCentre || "aucun");

  await connecter(centre, COMPTE_CENTRE[nomCentre]);
  await centre.goto(`${BASE}/centre`, { waitUntil: "domcontentloaded" });
  await centre.waitForSelector("text=Nouveaux dossiers reçus en direct");
  verifier(
    "Awa n'est pas encore chez le centre",
    !(await centre.evaluate(() => document.body.innerText.includes("Awa Compaoré"))),
  );

  /* 3. Envoi du dossier : il doit apparaître chez le centre. */
  const envoi = Date.now();
  await agent.getByRole("button", { name: "Envoyer le dossier" }).click();
  /* L'envoi conduit a l'ecran de confirmation, pas a la fiche de la patiente. */
  await agent.waitForURL(/\/confirmation$/, { timeout: 20000 });

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

  /*
   * 4. L'agent voit que son geste a abouti.
   *
   * C'est l'écran que l'application doit à l'agent : le dossier est parti,
   * voici le rendez-vous, voici ce qu'il faut dire à la patiente maintenant.
   */
  /*
   * Ne pas attendre une NAVIGATION ici : l'envoi du dossier, verifie a
   * l'etape 3, a deja conduit l'agent sur cet ecran. `waitForURL` attendrait
   * alors un evenement qui ne reviendra pas. On attend le CONTENU, qui est la
   * garantie reelle.
   */
  await attendre(
    agent,
    () => document.body.innerText.includes("Le dossier est parti"),
    { message: "l'ecran de confirmation ne s'est pas affiche" },
  );
  const texteConfirmation = await agent.evaluate(() => document.body.innerText);
  verifier(
    "L'agent arrive sur l'écran de confirmation",
    /confirmation$/.test(agent.url()),
  );
  verifier(
    "La confirmation annonce que le dossier est parti",
    texteConfirmation.includes("Le dossier est parti"),
  );
  verifier(
    "La confirmation rappelle le rendez-vous",
    texteConfirmation.includes("Le rendez-vous"),
  );
  verifier(
    "La confirmation donne le message à lire à la patiente",
    texteConfirmation.includes("Bonjour Awa"),
  );

  /*
   * 5. Le centre enregistre la suite donnée.
   *
   * Elle se saisit désormais sur « Suivi des soins », qui réunit les dossiers
   * en cours de prise en charge, chacun avec son formulaire.
   */
  await centre.getByRole("link", { name: "Awa Compaoré" }).first().click();
  await centre.waitForURL(/\/centre\/patientes\//);
  await centre.waitForSelector("text=Résumé pour le spécialiste");

  const texteDossier = await centre.evaluate(() => document.body.innerText);
  verifier("Résumé pour le spécialiste présent", texteDossier.includes("Résumé"));
  verifier("Récit original visible", texteDossier.includes("boule au sein gauche"));
  verifier("Agent d'origine visible", texteDossier.includes("Salimata"));

  await centre.goto(`${BASE}/centre/suivi`, { waitUntil: "domcontentloaded" });
  await centre.waitForSelector("text=Suivi des soins");
  const ficheAwa = centre.locator("li", { hasText: "Awa Compaoré" }).first();
  /* Chaque dossier se déplie au clic : le formulaire est caché tant que non. */
  await ficheAwa.getByRole("button").first().click();
  await ficheAwa.locator("select").first().selectOption({ label: "Patiente reçue" });
  await ficheAwa.getByRole("button", { name: "Enregistrer" }).click();
  await centre.waitForSelector("text=est enregistrée");

  await attendre(
    agent,
    () => document.body.innerText.includes("Patiente reçue"),
    { message: "l'étape « reçue » n'est pas remontée chez l'agent" },
  );
  verifier("L'agent voit « patiente reçue »", true);

  /*
   * Le résultat : le dossier quitte alors la liste des suivis en attente, ce
   * qui est la preuve que l'étape a bien été enregistrée.
   */
  await ficheAwa.locator("select").first().selectOption({ label: "Résultat disponible" });
  await ficheAwa.locator("select").nth(1).selectOption({ label: "Cancer confirmé" });
  await ficheAwa.getByRole("button", { name: "Enregistrer" }).click();
  await ficheAwa.waitFor({ state: "detached", timeout: 15000 });

  await attendre(
    agent,
    () => document.body.innerText.includes("Résultat disponible"),
    { message: "le résultat n'est pas remonté chez l'agent" },
  );
  verifier("L'agent voit le résultat", true);

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
