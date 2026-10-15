/**
 * Captures des adresses de production, pour le compte rendu.
 * Usage : NODE_PATH=/opt/dev/siira/node_modules node scripts/captures-adresses.js
 */
const { chromium } = require("playwright-core");
const fs = require("fs");

const SORTIE = process.env.SORTIE || "/opt/dev/siira/shots-prod";

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

/* [adresse, chemin, compte, largeur, hauteur, nom du fichier] */
const VUES = [
  ["https://siira-agent.vercel.app", "/", null, 360, 780, "agent-01-entree-360"],
  ["https://siira-agent.vercel.app", "/connexion", null, 360, 780, "agent-02-connexion-360"],
  ["https://siira-agent.vercel.app", "/agent", "pro-agent-saaba", 360, 780, "agent-03-patientes-360"],
  ["https://siira-centre.vercel.app", "/", null, 1280, 900, "centre-01-entree-1280"],
  ["https://siira-centre.vercel.app", "/centre", "pro-centre-bogodogo", 1280, 900, "centre-02-patientes-1280"],
];

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const navigateur = await chromium.launch({ executablePath: chrome(), args: ["--no-sandbox"] });
  const contexte = await navigateur.newContext();
  const page = await contexte.newPage();

  let baseCourante = null;
  for (const [base, chemin, compte, largeur, hauteur, nom] of VUES) {
    if (baseCourante !== base) {
      await page.goto(`${base}/connexion`, { waitUntil: "domcontentloaded" });
      baseCourante = base;
    }
    await page.setViewportSize({ width: largeur, height: hauteur });
    await page.evaluate(
      (id) =>
        id
          ? sessionStorage.setItem("siira.session.v1", id)
          : sessionStorage.removeItem("siira.session.v1"),
      compte,
    );
    await page.goto(base + chemin, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const fichier = `${SORTIE}/${nom}.png`;
    await page.screenshot({ path: fichier });
    console.log(`OK ${base}${chemin} (${largeur} px) -> ${fichier}`);
  }

  await navigateur.close();
})();
