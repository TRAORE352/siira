"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker de Siira.
 *
 * Il sert à deux choses : rendre l'application installable sur le téléphone, et
 * ne pas retélécharger les fichiers qui ne changent jamais, sur un réseau faible.
 *
 * L'enregistrement a lieu sur toutes les pages de l'adresse, et pas seulement
 * après la connexion : sinon, une personne qui n'a pas encore de session ne
 * pourrait pas installer l'application, puisque l'invitation du navigateur
 * n'apparaît que si un service worker contrôle déjà la page.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
