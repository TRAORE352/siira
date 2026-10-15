/**
 * Captures du parcours de consultation, étape par étape.
 * Usage : node scripts/apercu-consultation.js [--base http://localhost:3100]
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
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "siira-consult-"));
  const contexte = await chromium.launchPersistentContext(profil, {
    executablePath: chrome(),
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = contexte.pages()[0] ?? (await contexte.newPage());
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") erreurs.push(m.text());
  });

  async function cliche(nom) {
    const fichier = path.join(DOSSIER, `${nom}.png`);
    await page.screenshot({ path: fichier });
    console.log(fichier);
  }

  /* Connexion par téléphone, comme un vrai agent. */
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.getByLabel(/Numéro de téléphone/).fill("70123456");
  await page.getByLabel(/Code secret/).fill("123456");
  await page.getByRole("button", { name: /Ouvrir mon espace/ }).click();
  await page.waitForURL(/\/agent$/, { timeout: 20000 });

  await page.getByRole("link", { name: "Nouvelle consultation" }).click();
  await page.waitForSelector('input[autocomplete="off"]');
  await page.waitForTimeout(700);
  await cliche("10-consult-etape1-vide");

  const continuer = () =>
    page.getByRole("button", { name: "Continuer", exact: true }).click();

  /* Étape 1 */
  await page.fill('input[autocomplete="off"]', "Awa Compaoré");
  await page.fill('input[type="number"]', "41");
  await page.waitForTimeout(300);
  await cliche("11-consult-etape1-remplie");
  await continuer();

  /* Étape 2 */
  await page.waitForSelector("select");
  await page.waitForTimeout(700);
  await cliche("12-consult-etape2");
  await page.selectOption("select", { label: "Saaba" });
  await continuer();

  /* Étape 3 */
  await page.waitForSelector('input[type="radio"]');
  await page.waitForTimeout(700);
  await cliche("13-consult-etape3");
  await page.click("text=Elle ne peut pas payer");
  await continuer();

  /* Étape 4 */
  await page.waitForSelector("textarea");
  await page.waitForTimeout(700);
  await cliche("14-consult-etape4");
  await page.fill(
    "textarea",
    "Elle a une boule au sein gauche depuis deux mois, ça ne fait pas mal, la peau est un peu tirée.",
  );
  await continuer();

  /* Étape 5 : récapitulatif */
  await page.waitForSelector('input[type="checkbox"]');
  await page.waitForTimeout(700);
  await cliche("15-consult-etape5-recap");

  await page.click('input[type="checkbox"]');
  await page.getByRole("button", { name: "Analyser le cas" }).click();
  await page.waitForURL(/\/resultat$/, { timeout: 20000 });
  await page.waitForTimeout(900);
  await cliche("16-consult-resultat");

  console.log(
    erreurs.length === 0
      ? "aucune erreur console"
      : `ERREURS CONSOLE : ${JSON.stringify(erreurs)}`,
  );

  await contexte.close();
  fs.rmSync(profil, { recursive: true, force: true });
})();
