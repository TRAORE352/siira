#!/usr/bin/env node
/**
 * Audit du rendu REEL d'un site Next.js servi en local.
 *
 * Mesure ce que l'oeil verrait, pas ce que le code pretend faire :
 *   - erreurs console et exceptions JS
 *   - reponses HTTP >= 400 (favicon, icon, images manquantes)
 *   - debordement horizontal (scrollWidth > clientWidth) par point de rupture
 *   - accessibilite de base (alt, h1 unique, lang, noms accessibles)
 *   - luminance d'une zone, pour prouver qu'un element decoratif est VISIBLE
 *
 * Usage :
 *   node visual-audit.js                       # audit complet, config par defaut
 *   node visual-audit.js --base http://127.0.0.1:3000
 *   node visual-audit.js --zone 700,150,620,620 --path /fr
 *
 * Prerequis : npm i playwright-core ; un Chromium present sur la machine.
 * Renseigner CHROME_PATH si l'auto-detection echoue.
 */

const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

/* ----------------------------- configuration ----------------------------- */

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const BASE = arg("base", "http://127.0.0.1:3000");
const SHOTS = arg("out", "/tmp/shots");

// Chaque vue : [chemin, largeur, nom]. Couvrir mobile ET desktop : un
// debordement n'existe souvent qu'a un seul point de rupture.
const VIEWS = [
  ["/design", 1280, "design-d"],
  ["/design", 360, "design-m"],
  ["/", 1280, "accueil-d"],
  ["/", 360, "accueil-m"],
];

// Pages soumises au controle d'accessibilite.
const A11Y_PATHS = ["/design", "/"];

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const roots = [
    path.join(process.env.HOME || "/root", ".cache/ms-playwright"),
    "/ms-playwright",
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root).filter((d) => d.startsWith("chromium-")).sort().reverse()) {
      for (const rel of ["chrome-linux64/chrome", "chrome-linux/chrome"]) {
        const p = path.join(root, dir, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  for (const p of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Chromium introuvable. Renseigner CHROME_PATH.");
}

/* -------------------------------- helpers -------------------------------- */

/** Defile toute la page : declenche les apparitions au scroll et le lazy-load. */
const scrollAll = async (page) =>
  page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    window.scrollTo(0, 0);
  });

/**
 * Luminance d'une zone du rendu COMPOSITE.
 * Seul moyen de prouver qu'un element decoratif est reellement visible :
 * interroger le contexte 2D d'un canvas confirme que le dessin tourne, pas
 * qu'il arrive jusqu'a l'ecran (voile, degrade, z-index negatif).
 */
async function zoneLuminance(page, clip) {
  const b64 = (await page.screenshot({ clip, type: "png" })).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let max = 0, sum = 0, visible = 0, accent = 0, n = 0;
    for (let k = 0; k < d.length; k += 4) {
      const r = d[k], g = d[k + 1], b = d[k + 2];
      const L = (r + g + b) / 3;
      sum += L; n++;
      if (L > max) max = L;
      if (L > 25) visible++;
      if (g > r + 12 && b > r + 12 && g > 30) accent++; // teinte froide
    }
    return { max: max | 0, avg: +(sum / n).toFixed(1), visible, accent };
  }, b64);
}

/* --------------------------------- audit --------------------------------- */

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const issues = [];

  for (const [route, width, name] of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 0.8 });
    const page = await ctx.newPage();

    page.on("response", (r) => {
      if (r.status() >= 400) issues.push(`${name}: HTTP ${r.status()} ${r.url()}`);
    });
    page.on("pageerror", (e) => issues.push(`${name}: JS ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") issues.push(`${name}: console ${m.text()}`);
    });

    try {
      await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
      await scrollAll(page);
      await page.waitForTimeout(1200);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      if (overflow > 1) {
        // Remonter au coupable : l'element qui depasse ET sa chaine de parents.
        const culprits = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          return [...document.querySelectorAll("*")]
            .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1; })
            .slice(0, 5)
            .map((el) => `${el.tagName}.${(el.className || "").toString().slice(0, 60)}`);
        });
        issues.push(`${name}: debordement ${overflow}px -> ${culprits.join(" | ")}`);
      }

      fs.writeFileSync(path.join(SHOTS, `${name}.jpg`), await page.screenshot({ type: "jpeg", quality: 55 }));
    } catch (e) {
      issues.push(`${name}: ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }

  // Accessibilite
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const route of A11Y_PATHS) {
    try {
      await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
      const a = await page.evaluate(() => ({
        imgSansAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
        h1: document.querySelectorAll("h1").length,
        lang: document.documentElement.lang,
        liensVides: [...document.querySelectorAll("a")].filter((x) => !x.textContent.trim() && !x.getAttribute("aria-label")).length,
        boutonsSansNom: [...document.querySelectorAll("button")].filter((x) => !x.textContent.trim() && !x.getAttribute("aria-label")).length,
        skipLink: !!document.querySelector('a[href="#contenu"]'),
        main: document.querySelectorAll("main").length,
      }));
      if (a.imgSansAlt) issues.push(`a11y ${route}: ${a.imgSansAlt} img sans alt`);
      if (a.h1 !== 1) issues.push(`a11y ${route}: ${a.h1} h1 (attendu 1)`);
      if (!a.lang) issues.push(`a11y ${route}: attribut lang absent`);
      if (a.liensVides) issues.push(`a11y ${route}: ${a.liensVides} lien(s) sans nom accessible`);
      if (a.boutonsSansNom) issues.push(`a11y ${route}: ${a.boutonsSansNom} bouton(s) sans nom accessible`);
      if (!a.skipLink) issues.push(`a11y ${route}: lien d'evitement absent`);
      if (a.main !== 1) issues.push(`a11y ${route}: ${a.main} <main> (attendu 1)`);
    } catch (e) {
      issues.push(`a11y ${route}: ${e.message.split("\n")[0]}`);
    }
  }

  // Luminance d'une zone, sur demande : --zone x,y,w,h [--path /fr]
  const zone = arg("zone", null);
  if (zone) {
    const [x, y, w, h] = zone.split(",").map(Number);
    await page.goto(BASE + arg("path", "/fr"), { waitUntil: "networkidle" });
    await page.waitForTimeout(3500); // laisser l'animation s'etablir
    const s = await zoneLuminance(page, { x, y, width: w, height: h });
    console.log(`zone ${zone} -> ${JSON.stringify(s)}`);
    if (s.max < 30) console.log("  ATTENTION: zone quasi noire, l'element est masque a l'ecran.");
  }

  // Poids et nombre de requetes de la page d'accueil
  await page.goto(BASE + "/", { waitUntil: "load" });
  console.log("perf " + JSON.stringify(await page.evaluate(() => {
    const res = performance.getEntriesByType("resource");
    return { requetes: res.length, poidsKo: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024) };
  })));

  await ctx.close();
  await browser.close();

  console.log(issues.length ? "PROBLEMES:\n" + issues.join("\n") : `RAS: aucune erreur, aucun debordement sur ${VIEWS.length} vues.`);
  process.exit(issues.length ? 1 : 0);
})();
