/**
 * Recette de l'écran de confirmation d'envoi d'un dossier.
 *
 * Parcourt le vrai chemin de l'agent — connexion, consultation, orientation,
 * envoi — puis contrôle ce que l'écran d'arrivée doit tenir. On ne pose pas la
 * session à la main : un raccourci validerait un chemin que personne n'emprunte.
 *
 * Usage : node scripts/verifier-confirmation.js [--base http://127.0.0.1:3123]
 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
function option(nom, defaut) {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
}
const BASE = option("base", "http://127.0.0.1:3123");

function chrome() {
  const r = "/root/.cache/ms-playwright";
  for (const d of fs.readdirSync(r))
    for (const n of ["chrome", "headless_shell"]) {
      const p = `${r}/${d}/chrome-linux/${n}`;
      if (fs.existsSync(p)) return p;
    }
  throw new Error("Chromium introuvable");
}

let ok = 0;
let ko = 0;
function dire(titre, valeur) {
  console.log((valeur ? "  OK  " : "  KO  ") + titre);
  if (valeur) {
    ok++;
  } else {
    ko++;
  }
}

(async () => {
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "siira-confirm-"));
  const contexte = await chromium.launchPersistentContext(profil, {
    executablePath: chrome(),
    args: ["--no-sandbox"],
    /* Petit téléphone : c'est là que les débordements apparaissent. */
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
  });
  const page = contexte.pages()[0] ?? (await contexte.newPage());

  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") erreurs.push(m.text());
  });

  const continuer = () =>
    page.getByRole("button", { name: "Continuer", exact: true }).click();

  /* Le parcours réel, de la connexion à l'envoi du dossier. */
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.getByLabel(/Numéro de téléphone/).fill("70123456");
  await page.getByLabel(/Mot de passe/).fill("123456");
  await page.getByRole("button", { name: /Ouvrir mon espace/ }).click();
  await page.waitForURL(/\/agent$/, { timeout: 20000 });

  await page.getByRole("link", { name: "Nouvelle consultation" }).click();
  await page.waitForSelector('input[autocomplete="off"]');
  await page.fill('input[autocomplete="off"]', "Fatou Sawadogo");
  await page.fill('input[type="number"]', "47");
  await continuer();

  await page.waitForSelector("select");
  await page.selectOption("select", { label: "Saaba" });
  await continuer();

  await page.waitForSelector('input[type="radio"]');
  await page.click("text=Elle ne peut pas payer");
  await continuer();

  await page.waitForSelector("textarea");
  await page.fill(
    "textarea",
    "Boule dure au sein droit depuis trois mois, la peau est rétractée.",
  );
  await continuer();

  await page.waitForSelector('input[type="checkbox"]');
  await page.click('input[type="checkbox"]');
  await page.getByRole("button", { name: "Analyser le cas" }).click();
  await page.waitForURL(/resultat$/, { timeout: 20000 });

  await page.getByRole("button", { name: /Continuer vers l'orientation/ }).click();
  await page.waitForURL(/orientation$/, { timeout: 20000 });
  const urlOrientation = page.url();

  await page.getByRole("button", { name: /Envoyer le dossier/ }).click();
  await page.waitForURL(/confirmation$/, { timeout: 20000 });
  await page.waitForTimeout(1500);

  dire("l'envoi mène à l'écran de confirmation", /confirmation$/.test(page.url()));

  dire(
    "un seul titre principal",
    (await page.evaluate(() => document.querySelectorAll("h1").length)) === 1,
  );

  /* L'aboutissement doit être annoncé, pas seulement montré. */
  dire(
    "l'aboutissement est annoncé aux lecteurs d'écran",
    await page.evaluate(() => !!document.querySelector('[role="status"]')),
  );

  const cibles = await page.evaluate(() =>
    [...document.querySelectorAll("button, a[href]")]
      .filter((e) => e.offsetParent)
      .map((e) => Math.round(e.getBoundingClientRect().height)),
  );
  const mini = Math.min(...cibles);
  dire(`toutes les actions font au moins 44px (${mini}px au minimum)`, mini >= 44);

  dire(
    "aucun débordement horizontal",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  );

  const texte = await page.evaluate(() => document.body.innerText);
  for (const attendu of ["Le dossier est parti", "Le rendez-vous", "Fatou"]) {
    dire(`« ${attendu} » est présent`, texte.includes(attendu));
  }
  dire("le message à lire à la patiente est présent", texte.includes("Bonjour Fatou"));

  /*
   * Rouvrir l'orientation d'un dossier déjà parti ne doit pas proposer de
   * l'envoyer une seconde fois : c'est la confirmation qui fait autorité.
   */
  await page.goto(urlOrientation, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  dire(
    "un dossier déjà envoyé renvoie vers la confirmation",
    /confirmation$/.test(page.url()),
  );

  dire(`aucune erreur console (${erreurs.length})`, erreurs.length === 0);
  if (erreurs.length) console.log("     " + JSON.stringify(erreurs));

  await contexte.close();
  fs.rmSync(profil, { recursive: true, force: true });

  console.log(
    ko === 0
      ? `\nCONFIRMATION CONFORME — ${ok} vérifications passées`
      : `\nÉCHEC — ${ko} problème(s) sur ${ok + ko}`,
  );
  process.exit(ko === 0 ? 0 : 1);
})();
