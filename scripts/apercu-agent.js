/**
 * Captures des écrans de l'agent, sur le serveur local.
 *
 * Usage : node scripts/apercu-agent.js [--base http://localhost:3100]
 * Les fichiers sont écrits dans shots-design/.
 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const os = require("os");

const args = process.argv.slice(2);
function option(nom, defaut) {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
}
const BASE = option("base", "http://localhost:3100");
const DOSSIER = path.join(__dirname, "..", "shots-design");

function chrome() {
  const r = "/root/.cache/ms-playwright";
  for (const d of fs.readdirSync(r))
    for (const n of ["chrome", "headless_shell"]) {
      const p = `${r}/${d}/chrome-linux/${n}`;
      if (fs.existsSync(p)) return p;
    }
  throw new Error("Chromium introuvable");
}

(async () => {
  fs.mkdirSync(DOSSIER, { recursive: true });
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "siira-apercu-"));
  const contexte = await chromium.launchPersistentContext(profil, {
    executablePath: chrome(),
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = contexte.pages()[0] ?? (await contexte.newPage());

  async function cliche(nom, pleine = false) {
    const fichier = path.join(DOSSIER, `${nom}.png`);
    await page.screenshot({ path: fichier, fullPage: pleine });
    console.log(fichier);
  }

  /* 0. Page d'entrée. */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await cliche("00-entree");

  /* 1. Connexion, vide. */
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await cliche("01-connexion-vide");

  /* 2. Connexion, remplie. */
  await page.getByLabel(/Numéro de téléphone/).fill("70123456");
  await page.getByLabel(/Mot de passe/).fill("1234");
  await page.waitForTimeout(300);
  await cliche("02-connexion-remplie");

  /*
   * 3. Numéros que l'application doit accepter.
   * Celui qui a été refusé à tort en production figure en tête : un numéro
   * valide ne doit JAMAIS produire de message d'erreur.
   */
  for (const essai of ["25123456", "04123456", "09123456", "60123456", "01234567"]) {
    await page.getByLabel(/Numéro de téléphone/).fill(essai);
    await page.getByLabel(/Mot de passe/).fill("123456");
    await page.getByRole("button", { name: /Ouvrir mon espace/ }).click();
    /*
      Attendre l'arrivée, ne pas lire l'URL après un délai fixe : en production
      la navigation prend plus longtemps qu'en local, et une lecture trop tôt
      fait conclure à tort que le numéro a été refusé.
    */
    const arrive = await page
      .waitForURL(/\/agent$/, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (!arrive) {
      const refuse = await page.getByText(/ne ressemble pas/).count();
      console.log(`  ${essai} : ${refuse ? "REFUSE A TORT" : "bloque"}`);
      throw new Error(`Le numéro ${essai} aurait dû être accepté`);
    }
    console.log(`  ${essai} : ACCEPTE`);
    /* Revenir à la connexion pour l'essai suivant. */
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  }

  /* 4. Erreur réelle : un numéro trop court. */
  await page.getByLabel(/Numéro de téléphone/).fill("7012");
  await page.getByRole("button", { name: /Ouvrir mon espace/ }).click();
  await page.waitForTimeout(400);
  await cliche("03-connexion-erreur");

  /* 5. Accueil de l'agent. */
  await page.getByLabel(/Numéro de téléphone/).fill("70123456");
  await page.getByLabel(/Code secret/).fill("123456");
  await page.getByRole("button", { name: /Ouvrir mon espace/ }).click();
  await page.waitForURL(/\/agent$/, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await cliche("04-agent-accueil");
  await cliche("05-agent-accueil-complet", true);

  await contexte.close();
  fs.rmSync(profil, { recursive: true, force: true });
})();
