#!/usr/bin/env node
/**
 * Verifie une adresse de Siira : son espace est-il respecte ?
 *
 * Le script interroge l'adresse reellement servie (en local ou en production)
 * et controle quatre choses :
 *   1. la page d'entree parle bien du bon public ;
 *   2. la connexion ne propose que les comptes de cet espace ;
 *   3. les ecrans des autres espaces sont refuses, pas seulement caches ;
 *   4. le manifeste et le service worker sont en place (installation sur le
 *      telephone pour l'agent).
 *
 * Usage :
 *   node scripts/verifier-espaces.js --base https://siira-agent.vercel.app --espace agent
 *   node scripts/verifier-espaces.js --base http://localhost:3101 --espace agent --pwa
 */

const fs = require("fs");

const args = process.argv.slice(2);
const lireArg = (nom, defaut = null) => {
  const i = args.indexOf(`--${nom}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : defaut;
};

const BASE = (lireArg("base") || process.env.BASE || "http://localhost:3100").replace(/\/$/, "");
const ESPACE = lireArg("espace", "complet");
const AVEC_PWA = args.includes("--pwa");

/* Ce que chaque espace doit montrer, et surtout ce qu'il ne doit pas montrer. */
const ATTENDU = {
  agent: {
    mention: "Espace agent de santé",
    titre: "Siira, espace agent de santé",
    entree: "/agent",
    /*
     * L'agent ne se connecte plus par compte mais par numéro de téléphone et
     * code à 6 chiffres : on vérifie donc la présence de cette saisie, et
     * l'absence totale de compte de démonstration — y compris le sien.
     */
    comptes: [],
    connexionTelephone: true,
    interdits: [
      "Salimata Ouédraogo",
      "Boukary Sawadogo",
      "Mariam Kaboré",
      "Dr Alimata Zongo",
      "Clarisse Tapsoba",
      "Hamidou Barry",
      "Équipe Siira",
      "Comptes de démonstration",
      "Compte de démonstration",
    ],
    refuses: ["/centre", "/centre/disponibilites", "/ong", "/ong/impact", "/admin", "/design"],
  },
  centre: {
    mention: "Espace centre spécialisé",
    titre: "Siira, espace centre spécialisé",
    entree: "/centre",
    comptes: ["Dr Alimata Zongo", "Dr Issa Compaoré", "Dr Rasmata Nikiéma", "Dr Paul Ilboudo"],
    interdits: ["Salimata Ouédraogo", "Clarisse Tapsoba", "Équipe Siira"],
    refuses: ["/agent", "/agent/consultation/nouvelle", "/ong", "/admin", "/design"],
  },
  ong: {
    mention: "Espace ONG partenaire",
    titre: "Siira, espace ONG partenaire",
    entree: "/ong",
    comptes: ["Clarisse Tapsoba", "Hamidou Barry"],
    interdits: ["Salimata Ouédraogo", "Dr Alimata Zongo", "Équipe Siira"],
    refuses: ["/agent", "/centre", "/centre/dossier/ori-1", "/admin", "/design"],
  },
  complet: {
    mention: null,
    titre: "Siira, le chemin vers les soins",
    entree: "/",
    comptes: ["Salimata Ouédraogo", "Dr Alimata Zongo", "Clarisse Tapsoba", "Équipe Siira"],
    interdits: [],
    refuses: [],
  },
};

const etapes = [];
let echecs = 0;

function verifier(libelle, condition, detail = "") {
  const ok = Boolean(condition);
  if (!ok) echecs += 1;
  etapes.push(`${ok ? "OK   " : "ECHEC"} ${libelle}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function lire(chemin, options = {}) {
  const reponse = await fetch(BASE + chemin, { redirect: "manual", ...options });
  const texte = await reponse.text();
  return { statut: reponse.status, entetes: reponse.headers, texte };
}

(async () => {
  const attendu = ATTENDU[ESPACE];
  if (!attendu) {
    console.error(`Espace inconnu : ${ESPACE}. Attendu : agent, centre, ong ou complet.`);
    process.exit(2);
  }

  console.log(`\n--- ${BASE} (espace ${ESPACE}) ---`);

  /* 1. Page d'entree */
  const racine = await lire("/");
  verifier("la racine répond", racine.statut === 200, `statut ${racine.statut}`);
  verifier("l’espace est annoncé sur la racine", attendu.mention ? racine.texte.includes(attendu.mention) : true, attendu.mention ?? "application complète");
  verifier(
    "les écrans des autres espaces ne sont pas proposés sur la racine",
    attendu.interdits.every((mot) => !racine.texte.includes(mot)),
  );

  /* 2. Connexion : bons comptes, et seulement eux */
  const connexion = await lire("/connexion");
  verifier("la connexion répond", connexion.statut === 200, `statut ${connexion.statut}`);
  verifier(`le titre annonce « ${attendu.titre} »`, connexion.texte.includes(attendu.titre));

  /*
   * L'agent se connecte par numéro de téléphone et code à 6 chiffres. On
   * contrôle le rendu servi, pas les sources : c'est ce que reçoit le
   * téléphone de l'agent qui compte.
   */
  if (attendu.connexionTelephone) {
    verifier(
      "la connexion demande un numéro de téléphone",
      connexion.texte.includes("Numéro de téléphone"),
    );
    verifier("l’indicatif du Burkina Faso est affiché", connexion.texte.includes("+226"));
    verifier("la connexion demande un code secret", connexion.texte.includes("Code secret"));
    verifier(
      "le code annoncé compte bien 6 chiffres",
      connexion.texte.includes("6 chiffres"),
    );
    verifier(
      "aucun champ de mot de passe n’est servi",
      !connexion.texte.includes('type="password"'),
    );
    verifier(
      "aucune adresse de démonstration n’est servie",
      !connexion.texte.includes("@siira.demo"),
    );
  }

  for (const nom of attendu.comptes) {
    verifier(`le compte « ${nom} » est proposé`, connexion.texte.includes(nom));
  }
  for (const nom of attendu.interdits) {
    verifier(`le compte « ${nom} » n’est pas proposé`, !connexion.texte.includes(nom));
  }

  /* 3. Les autres espaces sont refusés, pas seulement cachés */
  for (const chemin of attendu.refuses) {
    const refus = await lire(chemin);
    const redirige = refus.statut === 307 || refus.statut === 308 || refus.statut === 302;
    const emplacement = refus.entetes.get("location") || "";
    verifier(
      `${chemin} est refusé`,
      redirige && emplacement.endsWith("/connexion"),
      `statut ${refus.statut} vers ${emplacement || "nulle part"}`,
    );
  }

  /* L'entree de l'espace reste ouverte */
  const entree = await lire(attendu.entree);
  verifier(`l’entrée de l’espace (${attendu.entree}) reste ouverte`, entree.statut === 200, `statut ${entree.statut}`);

  /* 4. Manifeste et service worker */
  const manifeste = await lire("/manifest.webmanifest");
  verifier("le manifeste répond", manifeste.statut === 200, `statut ${manifeste.statut}`);
  let manifesteJson = null;
  try {
    manifesteJson = JSON.parse(manifeste.texte);
  } catch {
    manifesteJson = null;
  }
  if (verifier("le manifeste est un JSON valide", manifesteJson !== null)) {
    const depart = ESPACE === "complet" ? "/" : attendu.entree;
    verifier(`l’application s’ouvre sur ${depart}`, manifesteJson.start_url === depart, `start_url = ${manifesteJson.start_url}`);
    verifier(`la portée est ${depart}`, manifesteJson.scope === depart, `scope = ${manifesteJson.scope}`);
    verifier("le nom de l’application est celui de l’espace", manifesteJson.name === attendu.titre, manifesteJson.name);
    verifier("elle s’affiche sans barre de navigateur", manifesteJson.display === "standalone");
    const tailles = (manifesteJson.icons || []).map((i) => i.sizes);
    verifier("elle fournit les icônes 192 et 512", tailles.includes("192x192") && tailles.includes("512x512"), tailles.join(", "));
  }

  const sw = await lire("/sw.js");
  verifier("le service worker est servi", sw.statut === 200, `statut ${sw.statut}`);
  verifier(
    "le service worker est servi comme du javascript",
    (sw.entetes.get("content-type") || "").includes("javascript"),
    sw.entetes.get("content-type") || "type inconnu",
  );
  for (const icone of ["/brand/icon-192.png", "/brand/icon-512.png"]) {
    const r = await lire(icone);
    verifier(`l’icône ${icone} est servie`, r.statut === 200, `statut ${r.statut}`);
  }

  /*
   * Intégrité de la construction : tout ce que la page demande doit exister.
   * Un serveur resté en place après une reconstruction sert un mélange des
   * deux constructions : les fichiers javascript ont disparu, la page ne
   * s'hydrate plus, et les écrans se figent. Ce contrôle attrape ce cas, en
   * local comme en production.
   */
  const fichiers = [...new Set(racine.texte.match(/\/_next\/static\/[^"']+\.js/g) || [])];
  const manquants = [];
  for (const fichier of fichiers) {
    const r = await lire(fichier);
    if (r.statut !== 200) manquants.push(`${fichier} (${r.statut})`);
  }
  verifier(
    `les ${fichiers.length} fichiers javascript de la page sont tous servis`,
    fichiers.length > 0 && manquants.length === 0,
    manquants.slice(0, 3).join(", ") || "tous présents",
  );

  /* 5. Au navigateur : le service worker s'installe-t-il vraiment ? */
  if (AVEC_PWA) {
    const { chromium } = require("playwright-core");
    const os = require("os");
    const path = require("path");
    const chrome = () => {
      if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
      const r = "/root/.cache/ms-playwright";
      for (const d of fs.readdirSync(r))
        for (const n of ["chrome", "headless_shell"]) {
          const p = `${r}/${d}/chrome-linux/${n}`;
          if (fs.existsSync(p)) return p;
        }
      throw new Error("Chromium introuvable");
    };

    /*
     * Profil réel plutôt que navigation privée : Chrome refuse d'examiner
     * l'installation dans une fenêtre privée, et son verdict serait alors
     * inutilisable. Le profil est jetable, effacé à la fin du contrôle.
     */
    const profil = fs.mkdtempSync(path.join(os.tmpdir(), "siira-profil-"));
    const contexte = await chromium.launchPersistentContext(profil, {
      executablePath: chrome(),
      args: ["--no-sandbox"],
      viewport: { width: 360, height: 780 },
    });
    const page = contexte.pages()[0] ?? (await contexte.newPage());

    await page.goto(`${BASE}${attendu.entree === "/" ? "/" : attendu.entree}`, { waitUntil: "networkidle" });

    const lienManifeste = await page.getAttribute('link[rel="manifest"]', "href");
    verifier("la page déclare le manifeste", Boolean(lienManifeste), lienManifeste || "aucun lien");

    const enregistre = await page.evaluate(async () => {
      for (let i = 0; i < 40; i += 1) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) return true;
        await new Promise((suite) => setTimeout(suite, 100));
      }
      return false;
    });
    verifier("le service worker s’enregistre", enregistre);

    /* Chrome lui-même relit le manifeste : ses erreurs sont notre meilleur juge. */
    const session = await page.context().newCDPSession(page);
    await session.send("Page.enable");
    const app = await session.send("Page.getAppManifest");
    const erreurs = (app.errors || []).filter((e) => e.critical);
    verifier("Chrome accepte le manifeste", erreurs.length === 0, erreurs.map((e) => e.message).join(" | ") || "aucune erreur");
    verifier("Chrome lit bien les icônes", Boolean(app.data) && app.data.includes("icon-192"), "manifeste relu par Chrome");

    /* Verdict de Chrome sur l'installation, quand il sait le donner. */
    try {
      const verdict = await session.send("Page.getInstallabilityErrors");
      const liste = verdict.installabilityErrors || [];
      const deEnvironnement = new Set(["in-incognito", "not-in-main-frame"]);
      const reelles = liste.filter((e) => !deEnvironnement.has(e.errorId));
      if (liste.length > 0 && reelles.length === 0) {
        console.log(
          "      (installation non mesurable dans ce cadre de test : " + liste.map((e) => e.errorId).join(", ") + ")",
        );
      } else {
        verifier(
          "Chrome considère l’application installable",
          reelles.length === 0,
          reelles.map((e) => e.errorId).join(", ") || "aucune raison de refus",
        );
      }
    } catch {
      console.log("      (Chrome ne fournit pas son verdict d’installation dans cette version)");
    }

    await contexte.close();
    fs.rmSync(profil, { recursive: true, force: true });
  }

  console.log(etapes.join("\n"));
  console.log(
    echecs === 0
      ? `\nESPACE ${ESPACE.toUpperCase()} CONFORME — ${etapes.length} vérifications passées`
      : `\nESPACE ${ESPACE.toUpperCase()} : ${echecs} problème(s) sur ${etapes.length} vérifications`,
  );
  process.exit(echecs === 0 ? 0 : 1);
})();
