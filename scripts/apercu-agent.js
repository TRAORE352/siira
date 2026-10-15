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

  /* 1. Connexion, vide. */
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await cliche("01-connexion-vide");

  /* 2. Connexion, remplie. */
  await page.getByLabel(/Numéro de téléphone/).fill("70123456");
  await page.getByLabel(/Code secret/).fill("1234");
  await page.waitForTimeout(300);
  await cliche("02-connexion-remplie");

  /* 3. Erreur de numéro. */
  await page.getByLabel(/Numéro de téléphone/).fill("12345678");
  await page.getByRole("button", { name: /Ouvrir mon espace/ }).click();
  await page.waitForTimeout(400);
  await cliche("03-connexion-erreur");

  /* 4. Accueil de l'agent. */
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
