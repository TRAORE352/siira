#!/usr/bin/env node
/**
 * Relevé du rendu réel : ce qui s'affiche, et à quelle taille.
 * Sert à juger la hiérarchie visuelle sans regarder une capture.
 */
const { chromium } = require("playwright-core");
const fs = require("fs");

const BASE = process.env.BASE || "http://localhost:3100";
function chrome() {
  const r = "/root/.cache/ms-playwright";
  for (const d of fs.readdirSync(r))
    for (const n of ["chrome", "headless_shell"]) {
      const p = `${r}/${d}/chrome-linux/${n}`;
      if (fs.existsSync(p)) return p;
    }
}

const ECRANS = [
  ["/connexion", null, 360],
  ["/agent", "pro-agent-saaba", 360],
  ["/centre", "pro-centre-bogodogo", 1280],
];

(async () => {
  const nav = await chromium.launch({ executablePath: chrome(), args: ["--no-sandbox"] });
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`, { waitUntil: "domcontentloaded" });

  for (const [chemin, compte, largeur] of ECRANS) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.evaluate(
      (id) =>
        id
          ? sessionStorage.setItem("siira.session.v1", id)
          : sessionStorage.removeItem("siira.session.v1"),
      compte,
    );
    await page.goto(BASE + chemin, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const r = await page.evaluate(() => {
      const fond = getComputedStyle(document.body).backgroundColor;
      const titres = Array.from(document.querySelectorAll("h1, h2, h3"))
        .filter((e) => e.offsetParent !== null)
        .slice(0, 5)
        .map((e) => {
          const s = getComputedStyle(e);
          return `${e.tagName} ${Math.round(parseFloat(s.fontSize))}px ${
            s.fontFamily.split(",")[0]
          } « ${e.textContent.trim().slice(0, 42)} »`;
        });
      const principal = document.querySelector("button, a[class*='bg-rose']");
      const corps = getComputedStyle(document.body);
      const hauteurPage = document.documentElement.scrollHeight;
      return {
        fond,
        titres,
        texte: `${Math.round(parseFloat(corps.fontSize))}px ${corps.fontFamily.split(",")[0]} interligne ${corps.lineHeight}`,
        hauteurPage,
        principalFond: principal ? getComputedStyle(principal).backgroundColor : "—",
      };
    });

    console.log(`\n### ${chemin} (${largeur} px)`);
    console.log(`  fond page    : ${r.fond}`);
    console.log(`  texte courant: ${r.texte}`);
    console.log(`  hauteur      : ${r.hauteurPage} px`);
    for (const t of r.titres) console.log(`  ${t}`);
  }

  await nav.close();
})();
