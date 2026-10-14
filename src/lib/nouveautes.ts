"use client";

/**
 * Repère les lignes qui viennent d'arriver, pour les mettre en évidence
 * quelques secondes (temps réel visible à l'écran).
 */

import { useEffect, useRef, useState } from "react";

export function useNouveautes(ids: string[], duree = 4000) {
  const [nouveaux, setNouveaux] = useState<Set<string>>(new Set());
  const connus = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Premier rendu : tout est déjà connu, rien n'est signalé.
    if (connus.current === null) {
      connus.current = new Set(ids);
      return;
    }
    const arrivants = ids.filter((id) => !connus.current!.has(id));
    if (arrivants.length === 0) return;

    for (const id of arrivants) connus.current.add(id);
    setNouveaux((precedents) => new Set([...Array.from(precedents), ...arrivants]));

    const t = setTimeout(() => {
      setNouveaux((precedents) => {
        const suivant = new Set(precedents);
        for (const id of arrivants) suivant.delete(id);
        return suivant;
      });
    }, duree);
    return () => clearTimeout(t);
  }, [ids.join("|"), duree]); // eslint-disable-line react-hooks/exhaustive-deps

  return nouveaux;
}
