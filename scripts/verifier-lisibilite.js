#!/usr/bin/env node
/**
 * Lisibilité d'un écran : ce que l'audit général ne regarde pas.
 *
 * 1. Les textes coupés. Un nom de patiente ou un état de dossier tronqué
 *    (« Korotimi Zoun… ») passe tous les autres contrôles : la page ne
 *    déborde pas, les cibles sont assez grandes, la console est muette. Il
 *    faut donc comparer la largeur du texte à celle de sa boîte.
 * 2. Ce qui reste caché sous une barre fixe, une fois la page défilée en bas.
 * 3. Le contraste WCAG de chaque texte, calculé sur le rendu réel. Tailwind
 *    v4 écrit les couleurs translucides en `color-mix(in oklab, …)` : on
 *    demande donc au navigateur de peindre la couleur, plutôt que de lire un
 *    code couleur à la main.
 *
 * Usage :
 *   node scripts/verifier-lisibilite.js
 *   node scripts/verifier-lisibilite.js --chemin /centre --compte pro-centre-bogodogo --largeur 1280
 *   node scripts/verifier-lisibilite.js --stress       (noms longs, districts longs)
 */
const { chromium } = require("playwright-core");
const fs = require("fs");

function argument(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}

const BASE = argument("base", "http://localhost:3100");
const CHEMIN = argument("chemin", "/agent");
const COMPTE = argument("compte", "pro-agent-saaba");
const LARGEUR = Number(argument("largeur", "360"));
const STRESS = process.argv.includes("--stress");

function chrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const r = "/root/.cache/ms-playwright";
  for (const d of fs.readdirSync(r))
    for (const n of ["chrome", "headless_shell"]) {
      const p = `${r}/${d}/chrome-linux/${n}`;
      if (fs.existsSync(p)) return p;
    }
  throw new Error("Chromium introuvable");
}

/** Ce que le navigateur sait de la lisibilité, sans rien deviner. */
const AUDIT = () => {
  const sortie = { coupes: [], cachees: [], contraste: [], debordement: 0 };

  sortie.debordement = document.documentElement.scrollWidth - document.documentElement.clientWidth;

  for (const e of document.querySelectorAll("body *")) {
    if (e.children.length > 0 || e.offsetParent === null) continue;
    const texte = e.textContent.trim();
    if (!texte) continue;
    const s = getComputedStyle(e);
    /* Un texte coupé : la boîte coupe, et le contenu dépasse — en largeur
       quand la ligne ne revient jamais à la ligne, en hauteur quand le texte
       est limité à quelques lignes. */
    const coupeEnLargeur = s.overflowX === "hidden" || s.overflowX === "clip";
    const coupeEnHauteur = s.overflowY === "hidden" || s.overflowY === "clip";
    const deborde =
      (coupeEnLargeur && s.whiteSpace === "nowrap" && e.scrollWidth > e.clientWidth + 1) ||
      (coupeEnHauteur && e.scrollHeight > e.clientHeight + 1);
    if (deborde) {
      sortie.coupes.push(
        `« ${texte.slice(0, 45)} » — ${e.scrollWidth}x${e.scrollHeight} px de texte dans ${e.clientWidth}x${e.clientHeight} px (${Math.round(parseFloat(s.fontSize))} px)`,
      );
    }
  }

  /* Contraste : on peint la couleur sur un canvas, comme le navigateur le fait. */
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const peindre = (couleur, fond) => {
    ctx.clearRect(0, 0, 1, 1);
    if (fond) {
      ctx.fillStyle = fond;
      ctx.fillRect(0, 0, 1, 1);
    }
    ctx.fillStyle = couleur;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  };
  const srgb = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = (c) => 0.2126 * srgb(c.r) + 0.7152 * srgb(c.g) + 0.0722 * srgb(c.b);
  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  /* Opacité : on peint la couleur sur deux fonds très différents. Si le
     résultat est identique, la couleur est opaque. Cela évite de deviner
     l'écriture des couleurs — Tailwind v4 écrit `oklab(… / 0.08)`, et un
     simple test sur « rgba » se trompe. */
  const estOpaque = (couleur) => {
    const surRouge = peindre(couleur, "rgb(255, 0, 0)");
    const surBleu = peindre(couleur, "rgb(0, 0, 255)");
    return surRouge.r === surBleu.r && surRouge.g === surBleu.g && surRouge.b === surBleu.b;
  };
  const fondDe = (e) => {
    let n = e;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      const c = s.backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && estOpaque(c)) {
        return { couleur: c, degrade: s.backgroundImage !== "none" };
      }
      n = n.parentElement;
    }
    return { couleur: "rgb(255, 255, 255)", degrade: false };
  };

  for (const e of document.querySelectorAll("body *")) {
    if (e.children.length > 0 || e.offsetParent === null) continue;
    const texte = e.textContent.trim();
    if (!texte) continue;
    const s = getComputedStyle(e);
    const f = fondDe(e);
    const px = parseFloat(s.fontSize);
    const grand = px >= 24 || (px >= 18.66 && parseInt(s.fontWeight, 10) >= 700);
    const seuil = grand ? 3 : 4.5;
    const sur = peindre(s.color, f.couleur);
    const fond = peindre(f.couleur, "rgb(255, 255, 255)");
    let pire = ratio(sur, fond);
    if (f.degrade) {
      /* Le point le plus clair du dégradé de marque : le pire cas. */
      const clair = peindre("rgba(214, 51, 108, 0.32)", "rgb(42, 26, 32)");
      pire = ratio(peindre(s.color, "rgba(214, 51, 108, 0.32)"), clair);
    }
    if (pire < seuil) {
      sortie.contraste.push(
        `${pire.toFixed(2)}:1 (seuil ${seuil}) ${px} px « ${texte.slice(0, 45)} » sur ${f.couleur}${f.degrade ? " (dégradé)" : ""}`,
      );
    }
  }

  return sortie;
};

(async () => {
  const navigateur = await chromium.launch({ executablePath: chrome(), args: ["--no-sandbox"] });
  const page = await (
    await navigateur.newContext({ viewport: { width: LARGEUR, height: 844 }, locale: "fr-FR" })
  ).newPage();

  await page.goto(`${BASE}/connexion`, { waitUntil: "domcontentloaded" });
  await page.evaluate((id) => sessionStorage.setItem("siira.session.v1", id), COMPTE);
  await page.goto(BASE + CHEMIN, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const resultat = await page.evaluate(AUDIT);

  /* Ce qui reste caché sous la barre fixe, page défilée tout en bas. */
  const cachees = await page.evaluate(() => {
    scrollTo(0, document.body.scrollHeight);
    return new Promise((suite) =>
      setTimeout(() => {
        const barre = document.querySelector(".fixed.inset-x-0.bottom-0");
        if (!barre) return suite([]);
        const haut = barre.getBoundingClientRect().top;
        const vus = [];
        for (const e of document.querySelectorAll("main *")) {
          if (e.children.length > 0 || e.offsetParent === null) continue;
          const t = e.textContent.trim();
          if (!t) continue;
          const r = e.getBoundingClientRect();
          if (r.height > 0 && r.top >= haut) vus.push(`« ${t.slice(0, 40)} »`);
        }
        suite([...new Set(vus)]);
      }, 400),
    );
  });
  resultat.cachees = cachees;

  /* Test de résistance : des noms et des districts plus longs que la démo. */
  if (STRESS) {
    await page.evaluate(() => {
      const cartes = Array.from(document.querySelectorAll("main ul li a"));
      const longs = ["Aminata Ouédraogo Sawadogo", "Salimata Zongo Bationo", "Fatimata Kaboré"];
      cartes.forEach((a, i) => {
        const nom = a.querySelector("p");
        if (nom && longs[i]) nom.textContent = longs[i];
        const faits = a.querySelectorAll("p")[1];
        if (faits) faits.textContent = `${30 + i} ans · Kongoussi`;
      });
    });
    await page.waitForTimeout(200);
    const resiste = await page.evaluate(AUDIT);
    resultat.coupes = resiste.coupes;
  }

  console.log(`\n=== Lisibilité : ${CHEMIN} à ${LARGEUR} px${STRESS ? " (noms longs)" : ""} ===`);
  const dire = (titre, liste) =>
    console.log(`  ${titre} : ${liste.length ? "" : "rien"}\n${liste.map((l) => `      - ${l}`).join("\n")}`);
  dire("Textes coupés", resultat.coupes);
  dire("Cachés sous la barre fixe", resultat.cachees);
  dire("Sous le seuil AA", resultat.contraste);
  console.log(`  Débordement horizontal : ${resultat.debordement > 0 ? `${resultat.debordement} px` : "aucun"}`);

  const problemes =
    resultat.coupes.length + resultat.cachees.length + resultat.contraste.length + (resultat.debordement > 0 ? 1 : 0);
  console.log(problemes === 0 ? "\nLISIBLE — aucun défaut de lisibilité" : `\n${problemes} défaut(s) de lisibilité`);

  await navigateur.close();
  process.exit(problemes === 0 ? 0 : 1);
})();
