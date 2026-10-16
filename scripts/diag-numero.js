/** Pourquoi un numéro valide est-il refusé en production ? */
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.argv[2] || "https://siira-agent.vercel.app";

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
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "siira-diag-"));
  const contexte = await chromium.launchPersistentContext(profil, {
    executablePath: chrome(),
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });
  const page = contexte.pages()[0] ?? (await contexte.newPage());
  page.on("console", (m) => console.log("  console:", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("  ERREUR PAGE:", e.message));

  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });

  await page.getByLabel(/Numéro de téléphone/).fill("25123456");
  await page.getByLabel(/Mot de passe/).fill("123456");

  const avant = await page.evaluate(() => ({
    tel: document.querySelector('input[type="tel"]')?.value,
    texte: document.body.innerText,
  }));
  console.log("numéro affiché :", JSON.stringify(avant.tel));

  await page.getByRole("button", { name: /Ouvrir mon espace/ }).click();
  await page.waitForTimeout(2500);

  console.log("URL après clic :", page.url());
  const apres = await page.evaluate(() => document.body.innerText);
  const lignes = apres
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /manque|ressemble|Entrez|impossible|chiffres/i.test(l));
  console.log("messages à l'écran :", lignes);

  /* Le service worker sert-il une ancienne version ? */
  const sw = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map((r) => r.active?.scriptURL ?? "inactif");
  });
  console.log("service workers :", sw);

  await contexte.close();
  fs.rmSync(profil, { recursive: true, force: true });
})();
