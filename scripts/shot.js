#!/usr/bin/env node
/**
 * Capture d'ecran d'une ou plusieurs pages de Siira.
 * Usage : node scripts/shot.js /connexion 390 844 nom
 */
const { chromium } = require("playwright-core");
const fs = require("fs");

const [, , chemin = "/", lRaw = "390", hRaw = "900", nom = "capture"] = process.argv;
const base = process.env.BASE || "http://localhost:3100";
const largeur = Number(lRaw);
const hauteur = Number(hRaw);

function trouverChrome() {
  const racine = "/root/.cache/ms-playwright";
  for (const d of fs.readdirSync(racine)) {
    const p = `${racine}/${d}/chrome-linux/chrome`;
    if (fs.existsSync(p)) return p;
    const s = `${racine}/${d}/chrome-linux/headless_shell`;
    if (fs.existsSync(s)) return s;
  }
  throw new Error("Chromium introuvable");
}

(async () => {
  const navigateur = await chromium.launch({
    executablePath: process.env.CHROME_PATH || trouverChrome(),
    args: ["--no-sandbox"],
  });
  const page = await navigateur.newPage({
    viewport: { width: largeur, height: hauteur },
    deviceScaleFactor: 2,
  });
  const erreurs = [];
  page.on("console", (m) => m.type() === "error" && erreurs.push(m.text()));
  page.on("pageerror", (e) => erreurs.push(String(e)));

  await page.goto(base + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const fichier = `/tmp/siira-${nom}.png`;
  await page.screenshot({ path: fichier, fullPage: true });
  console.log(fichier);
  if (erreurs.length) console.log("ERREURS:", erreurs.join(" | "));
  await navigateur.close();
})();
