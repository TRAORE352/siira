/*
 * Siira — service worker.
 *
 * Il sert à deux choses, et rien de plus :
 *  1. rendre l'application installable sur le téléphone de l'agent ;
 *  2. éviter de retélécharger ce qui ne change jamais, sur un réseau faible.
 *
 * Le réseau reste prioritaire pour les écrans : une page de données n'est
 * jamais servie depuis le cache quand le réseau répond. Le cache n'intervient
 * qu'en secours, si le réseau manque.
 */

const CACHE = "siira-v1";

/* Ce qui est mis de côté dès l'installation : l'écran de connexion et les icônes. */
const COQUILLE = ["/connexion", "/brand/icon-192.png", "/brand/icon-512.png"];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(COQUILLE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  /* Jamais de cache pour un autre domaine, ni pour les données du serveur. */
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  /* Fichiers immuables : cache d'abord, ils portent leur empreinte dans le nom. */
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    evenement.respondWith(
      caches.match(requete).then(
        (enCache) =>
          enCache ||
          fetch(requete).then((reponse) => {
            const copie = reponse.clone();
            caches.open(CACHE).then((cache) => cache.put(requete, copie));
            return reponse;
          }),
      ),
    );
    return;
  }

  /* Écrans : réseau d'abord, cache seulement si le réseau manque. */
  if (requete.mode === "navigate") {
    evenement.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
          return reponse;
        })
        .catch(() =>
          caches.match(requete).then((enCache) => enCache || caches.match("/connexion")),
        ),
    );
  }
});
