"use client";

/**
 * Crochets React partagés.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { abonner, lireEtat } from "./data/magasin";

/**
 * Numéro de version de l'état, qui change à chaque écriture, y compris
 * lorsqu'elle vient d'un autre onglet. Sert de signal de rafraîchissement.
 *
 * Côté serveur la valeur est 0 : le premier rendu est identique partout,
 * et les données ne sont lues qu'une fois dans le navigateur.
 */
function versionCourante(): number {
  return lireEtat().version;
}

function versionServeur(): number {
  return 0;
}

export function useVersion(): number {
  return useSyncExternalStore(abonner, versionCourante, versionServeur);
}

/**
 * Relit une donnée à chaque changement de l'état de démonstration.
 *
 * Au premier rendu la valeur est `null` : l'écran affiche son état de
 * chargement, puis les données arrivent dès que le navigateur a pris la main.
 */
export function useDonnees<T>(calcul: () => T): { donnees: T | null; pret: boolean } {
  const version = useVersion();
  const [etat, setEtat] = useState<{ donnees: T | null; pret: boolean }>({
    donnees: null,
    pret: false,
  });

  // Le calcul est recréé à chaque rendu : on garde la dernière version sans
  // relancer l'abonnement. L'écriture a lieu dans l'effet, jamais au rendu.
  const dernier = useRef(calcul);
  useEffect(() => {
    dernier.current = calcul;
  });

  const relire = useCallback(() => {
    setEtat({ donnees: dernier.current(), pret: true });
  }, []);

  useEffect(() => {
    relire();
  }, [version, relire]);

  return { donnees: etat.donnees, pret: etat.pret };
}
