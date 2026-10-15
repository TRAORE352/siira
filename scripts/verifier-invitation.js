/**
 * L'invitation d'installation apparaît-elle vraiment, sur l'adresse de l'agent ?
 * Chrome ne la declenche qu'une fois le service worker actif : on attend donc
 * quelques secondes, dans un profil reel, et on capture la preuve.
 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

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
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "siira-pwa-"));
  const contexte = await chromium.launchPersistentContext(profil, {
    executablePath: chrome(),
    args: ["--no-sandbox"],
    viewport: { width: 360, height: 780 },
  });
  const page = contexte.pages()[0] ?? (await contexte.newPage());

  let invite = false;

  /* 1. La page d'entrée, ou l'agent arrive en premier. */
  await page.goto("https://siira-agent.vercel.app/", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await reg.update().catch(() => {});
  });
  const surEntree = await page
    .waitForFunction(() => document.body.innerText.includes("Installer Siira sur ce téléphone"), {
      timeout: 20000,
    })
    .catch(() => null);
  console.log("page d’entrée : encart d’installation", surEntree ? "VISIBLE" : "absent");

  /* 2. L'accueil de l'agent, une fois connecté. */
  await page.evaluate(() => sessionStorage.setItem("siira.session.v1", "pro-agent-saaba"));
  await page.goto("https://siira-agent.vercel.app/agent", { waitUntil: "networkidle" });
  const surAccueil = await page
    .waitForFunction(() => document.body.innerText.includes("Installer Siira sur ce téléphone"), {
      timeout: 20000,
    })
    .catch(() => null);
  console.log("accueil agent : encart d’installation", surAccueil ? "VISIBLE" : "absent");

  invite = Boolean(surEntree || surAccueil);
  console.log("encart d’installation visible :", invite ? "OUI" : "NON");

  if (invite) {
    const bouton = await page.getByRole("button", { name: "Installer", exact: true }).count();
    console.log("bouton « Installer » présent :", bouton > 0 ? "OUI" : "NON");
    await page.screenshot({ path: "/opt/dev/siira/shots-prod/agent-04-installation-360.png" });
    console.log("capture : /opt/dev/siira/shots-prod/agent-04-installation-360.png");
  }

  await contexte.close();
  fs.rmSync(profil, { recursive: true, force: true });
})();
