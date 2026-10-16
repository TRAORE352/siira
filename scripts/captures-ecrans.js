#!/usr/bin/env node
/**
 * Captures de TOUS les écrans, pour la vidéo et pour le dossier de présentation.
 *
 * Pourquoi un script plutôt que des captures à la main : les écrans d'un
 * parcours ne s'atteignent pas par leur adresse seule. Un écran de résultat ou
 * de confirmation exige qu'une consultation existe et porte le bon niveau
 * d'urgence ; une liste exige une session ouverte sur le bon compte. À la main
 * on capture alors des écrans vides ou des redirections, et on ne s'en aperçoit
 * qu'au montage.
 *
 * Ce script ouvre la session par `sessionStorage` — comme `audit-ecrans.js` —
 * puis REFUSE une capture dont l'écran est vide, en chargement, ou redirigé
 * ailleurs. Un fichier manquant vaut mieux qu'une capture inutilisable.
 *
 *     node scripts/captures-ecrans.js                      # localhost:3100
 *     BASE=https://siira-agent.vercel.app node scripts/captures-ecrans.js
 *     node scripts/captures-ecrans.js --sortie /root/captures
 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "http://localhost:3100";
const argv = process.argv.slice(2);
const SORTIE = (() => {
  const i = argv.indexOf("--sortie");
  return i >= 0 && argv[i + 1] ? argv[i + 1] : "/root/captures-siira";
})();
const PLEINE_PAGE = !argv.includes("--fenetre");

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

/*
 * Comptes de démonstration. Ce sont EUX qui donnent des écrans pleins : les
 * comptes réels (AG1042, CS2087) se connectent correctement mais leurs écrans
 * de travail lisent encore le magasin local, donc les listes s'affichent à
 * zéro. Pour des captures, la démonstration est la bonne source.
 */
const AGENT = "pro-agent-saaba";
const CENTRE = "pro-centre-bogodogo";
const ADMIN = "pro-admin";

/* Téléphone d'entrée de gamme pour l'agent, ordinateur pour le centre. */
const TEL = { width: 390, height: 844 };
const ORDI = { width: 1440, height: 900 };

/*
 * `attendu` : un texte qui ne peut venir QUE du bon écran. C'est le garde-fou
 * contre la capture d'une redirection : l'adresse répond 200, l'écran affiché
 * est celui de la connexion, et rien ne le signale.
 */
const ECRANS = [
  // --- Public
  ["00-accueil", "/", null, ORDI, "Siira"],
  /* En local, l'application COMPLETE sert l'ecran du CENTRE sur /connexion et
     /inscription (ESPACE_ACTIF = « complet »). Les ecrans de l'AGENT ne
     s'obtiennent qu'en visant l'adresse dediee :
       BASE=https://siira-agent.vercel.app node scripts/captures-ecrans.js
     Le texte attendu reste volontairement souple pour les deux formes. */
  ["01-connexion", "/connexion", null, TEL, null],
  ["02-inscription", "/inscription", null, TEL, null],

  // --- Espace agent (téléphone)
  ["10-agent-accueil", "/agent", AGENT, TEL, "Nouvelle consultation"],
  ["11-agent-patientes", "/agent/patientes", AGENT, TEL, null],
  ["12-agent-consultation-nouvelle", "/agent/consultation/nouvelle", AGENT, TEL, null],
  ["13-agent-patiente-rouge", "/agent/patiente/pat-1", AGENT, TEL, null],
  ["14-agent-patiente-orange", "/agent/patiente/pat-2", AGENT, TEL, null],
  ["15-agent-patiente-vert", "/agent/patiente/pat-6", AGENT, TEL, null],

  /* Les trois écrans du parcours, un par niveau d'urgence. Ce sont les plus
     utiles à la vidéo, et ceux que l'audit ne visite pas. */
  /*
   * Niveaux RELEVES dans demo.ts, pas supposes : con-1 rouge, con-2 orange,
   * con-6 vert. S'etre trompe ici produit une capture nommee « orange » qui
   * montre un ecran rouge — une erreur invisible au nommage, et grave dans une
   * video ou la couleur porte le propos.
   */
  /* Le garde-fou vise le DELAI affiche (libelles.ts), pas le nom du niveau :
     l'ecran ne porte pas « ROUGE » en majuscules. C'est la phrase que l'agent
     lit vraiment, donc la bonne preuve qu'on est sur le bon ecran. */
  ["20-resultat-rouge", "/agent/consultation/con-1/resultat", AGENT, TEL, "dans les 7 jours"],
  ["21-resultat-orange", "/agent/consultation/con-2/resultat", AGENT, TEL, "dans les 30 jours"],
  ["22-resultat-vert", "/agent/consultation/con-6/resultat", AGENT, TEL, "dans 3 mois"],
  ["25-confirmation-rouge", "/agent/consultation/con-1/confirmation", AGENT, TEL, null],
  ["26-confirmation-orange", "/agent/consultation/con-2/confirmation", AGENT, TEL, null],

  // --- Espace centre (ordinateur)
  ["30-centre-tableau", "/centre", CENTRE, ORDI, null],
  ["31-centre-patientes", "/centre/patientes", CENTRE, ORDI, null],
  ["32-centre-dossier", "/centre/patientes/ori-1", CENTRE, ORDI, null],
  ["33-centre-suivi", "/centre/suivi", CENTRE, ORDI, null],
  ["34-centre-prises-en-charge", "/centre/prises-en-charge", CENTRE, ORDI, null],
  ["35-centre-disponibilites", "/centre/disponibilites", CENTRE, ORDI, null],
  ["36-centre-compte", "/centre/compte", CENTRE, ORDI, null],

  // --- Espace équipe
  ["40-admin-accueil", "/admin", ADMIN, ORDI, null],
  ["41-admin-comptes", "/admin/comptes", ADMIN, ORDI, null],
  ["42-admin-centres", "/admin/centres", ADMIN, ORDI, null],
  ["43-admin-financeurs", "/admin/financeurs", ADMIN, ORDI, null],
  ["44-admin-demonstration", "/admin/demonstration", ADMIN, ORDI, null],
];

/* Signes qu'une capture ne vaut rien. Mieux vaut la refuser que la livrer. */
const SIGNES_DE_PANNE = [
  "Ouverture de votre espace",
  "Chargement",
  "This page could not be found",
  "Application error",
  "Une erreur est survenue",
];

const faits = [];
const refuses = [];

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const navigateur = await chromium.launch({ executablePath: chrome() });
  const contexte = await navigateur.newContext({
    viewport: ORDI,
    deviceScaleFactor: 2, // captures nettes : elles seront agrandies a la video
    locale: "fr-FR",
  });
  const page = await contexte.newPage();

  const erreurs = [];
  page.on("console", (m) => {
    if (m.type() === "error") erreurs.push(m.text().slice(0, 120));
  });
  page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 120)));

  // La session doit exister AVANT la première navigation applicative.
  await page.goto(`${BASE}/connexion`, { waitUntil: "domcontentloaded" });

  for (const [nom, chemin, compte, taille, attendu] of ECRANS) {
    erreurs.length = 0;
    await page.setViewportSize(taille);
    await page.evaluate(
      (id) =>
        id
          ? sessionStorage.setItem("siira.session.v1", id)
          : sessionStorage.removeItem("siira.session.v1"),
      compte,
    );

    await page.goto(BASE + chemin, { waitUntil: "networkidle" });
    await page.waitForTimeout(900); // laisse l'hydratation finir

    const urlFinale = new URL(page.url()).pathname;
    const texte = await page.locator("body").innerText();

    /* Redirigé ailleurs : l'écran capturé ne serait pas celui qu'on croit. */
    if (urlFinale !== chemin) {
      refuses.push(`${nom} : redirige vers ${urlFinale} (attendait ${chemin})`);
      continue;
    }
    const panne = SIGNES_DE_PANNE.find((s) => texte.includes(s));
    if (panne) {
      refuses.push(`${nom} : ecran en "${panne}"`);
      continue;
    }
    if (texte.trim().length < 40) {
      refuses.push(`${nom} : ecran quasi vide (${texte.trim().length} caracteres)`);
      continue;
    }
    if (attendu && !texte.includes(attendu)) {
      refuses.push(`${nom} : texte attendu absent ("${attendu}")`);
      continue;
    }

    const fichier = path.join(SORTIE, `${nom}.png`);
    await page.screenshot({ path: fichier, fullPage: PLEINE_PAGE });
    const ko = Math.round(fs.statSync(fichier).size / 1024);
    const dim = `${taille.width}x${taille.height}`;
    faits.push(`  ${nom.padEnd(32)} ${dim.padEnd(10)} ${String(ko).padStart(5)} Ko`);
    if (erreurs.length) faits.push(`      ! console : ${erreurs[0]}`);
  }

  await navigateur.close();

  console.log(`\nCAPTURES — ${BASE}`);
  console.log(`Dossier : ${SORTIE}\n`);
  faits.forEach((l) => console.log(l));
  if (refuses.length) {
    console.log(`\n${refuses.length} ECRAN(S) REFUSE(S) — rien de capture :`);
    refuses.forEach((l) => console.log(`  ${l}`));
  }
  console.log(`\n${faits.filter((l) => !l.includes("!")).length} captures ecrites, ${refuses.length} refusees.`);
  process.exit(refuses.length > 0 ? 1 : 0);
})();
