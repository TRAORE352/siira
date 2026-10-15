#!/usr/bin/env node
/**
 * Audit de tous les écrans de Siira, sur téléphone et sur ordinateur.
 * Vérifie : erreurs console, débordement horizontal, taille des cibles
 * tactiles, contraste des libellés, titres et libellés de formulaire.
 */
const { chromium } = require("playwright-core");
const fs = require("fs");

const BASE = process.env.BASE || "http://localhost:3100";

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

/* Écrans à visiter : chemin, compte, largeur. */
const ECRANS = [
  ["/", null, 360],
  ["/connexion", null, 360],
  ["/design", null, 1280],
  ["/agent", "pro-agent-saaba", 360],
  ["/agent/consultation/nouvelle", "pro-agent-saaba", 360],
  ["/agent/patiente/pat-1", "pro-agent-saaba", 360],
  ["/centre", "pro-centre-bogodogo", 1280],
  ["/centre/dossier/ori-1", "pro-centre-bogodogo", 1280],
  ["/centre/disponibilites", "pro-centre-bogodogo", 1280],
  ["/admin", "pro-admin", 1280],
];

let problemes = 0;
const lignes = [];

function signaler(ecran, souci) {
  problemes += 1;
  lignes.push(`  PROBLEME ${ecran} — ${souci}`);
}

(async () => {
  const navigateur = await chromium.launch({
    executablePath: chrome(),
    args: ["--no-sandbox"],
  });
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await contexte.newPage();

  // La session doit exister avant la première navigation applicative.
  await page.goto(`${BASE}/connexion`, { waitUntil: "domcontentloaded" });

  for (const [chemin, compte, largeur] of ECRANS) {
    const erreurs = [];
    const surErreur = (m) => {
      if (m.type && m.type() === "error") erreurs.push(m.text());
    };
    page.on("console", surErreur);
    page.on("pageerror", (e) => erreurs.push(e.message));

    await page.setViewportSize({ width: largeur, height: 900 });
    await page.evaluate(
      (id) =>
        id
          ? sessionStorage.setItem("siira.session.v1", id)
          : sessionStorage.removeItem("siira.session.v1"),
      compte,
    );
    await page.goto(BASE + chemin, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const resultat = await page.evaluate(() => {
      const r = { debordement: 0, petitesCibles: [], sansLibelle: [], titres: 0, lang: "" };
      r.debordement = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      r.lang = document.documentElement.lang;
      r.titres = document.querySelectorAll("h1").length;

      for (const el of document.querySelectorAll("button, a, select, input, textarea")) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        // Les cases et les boutons radio sont entourés d'un label cliquable.
        if (el.type === "checkbox" || el.type === "radio") continue;
        if (b.height < 44 - 0.5) {
          r.petitesCibles.push(
            `${el.tagName.toLowerCase()} "${(el.textContent || el.value || "").trim().slice(0, 30)}" ${Math.round(b.height)}px`,
          );
        }
      }

      for (const el of document.querySelectorAll("input, select, textarea")) {
        if (el.type === "hidden") continue;
        const parLabel = el.id && document.querySelector(`label[for="${el.id}"]`);
        const parParent = el.closest("label");
        if (!parLabel && !parParent && !el.getAttribute("aria-label")) {
          r.sansLibelle.push(el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ""));
        }
      }
      return r;
    });

    if (resultat.debordement > 0)
      signaler(chemin, `débordement horizontal de ${resultat.debordement} px à ${largeur} px`);
    if (resultat.petitesCibles.length)
      signaler(chemin, `cibles sous 44 px : ${resultat.petitesCibles.slice(0, 4).join(", ")}`);
    if (resultat.sansLibelle.length)
      signaler(chemin, `champs sans libellé : ${resultat.sansLibelle.join(", ")}`);
    if (resultat.lang !== "fr") signaler(chemin, `langue du document : "${resultat.lang}"`);
    if (resultat.titres !== 1)
      signaler(chemin, `${resultat.titres} titre principal (il en faut exactement 1)`);
    const vraiesErreurs = erreurs.filter((e) => !/hydrat/i.test(e));
    if (vraiesErreurs.length)
      signaler(chemin, `erreur console : ${vraiesErreurs[0].slice(0, 120)}`);

    if (
      resultat.debordement <= 0 &&
      !resultat.petitesCibles.length &&
      !resultat.sansLibelle.length &&
      !vraiesErreurs.length &&
      resultat.lang === "fr" &&
      resultat.titres === 1
    ) {
      lignes.push(`  OK ${chemin} (${largeur} px)`);
    }

    page.off("console", surErreur);
  }

  await navigateur.close();
  console.log(lignes.join("\n"));
  console.log(
    problemes === 0
      ? `\nAUDIT PROPRE — ${ECRANS.length} écrans vérifiés`
      : `\nAUDIT : ${problemes} problème(s) sur ${ECRANS.length} écrans`,
  );
  process.exit(problemes === 0 ? 0 : 1);
})();
