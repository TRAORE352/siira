"use client";

/**
 * Dictée par la voix, avec la reconnaissance vocale du navigateur.
 * Quand le navigateur ne la propose pas, le bouton est masqué et l'agent écrit.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface MoteurVocal {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechEvenement) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechEvenement {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

type Constructeur = new () => MoteurVocal;

function trouverMoteur(): Constructeur | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Constructeur;
    webkitSpeechRecognition?: Constructeur;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** La disponibilité du micro ne change pas pendant la visite. */
function abonnementInerte(): () => void {
  return () => {};
}

function dicteeDisponible(): boolean {
  return trouverMoteur() !== null;
}

function dicteeSurLeServeur(): boolean {
  return false;
}

export function useDictee(ajouterTexte: (texte: string) => void) {
  const disponible = useSyncExternalStore(
    abonnementInerte,
    dicteeDisponible,
    dicteeSurLeServeur,
  );
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const moteur = useRef<MoteurVocal | null>(null);
  const callback = useRef(ajouterTexte);

  // La fonction d'ajout change à chaque rendu : on garde la dernière,
  // sans jamais écrire pendant le rendu lui-même.
  useEffect(() => {
    callback.current = ajouterTexte;
  });

  // Couper le micro si l'agent quitte l'écran.
  useEffect(
    () => () => {
      moteur.current?.stop();
    },
    [],
  );

  const demarrer = useCallback(() => {
    const Moteur = trouverMoteur();
    if (!Moteur) return;
    setErreur(null);

    const m = new Moteur();
    m.lang = "fr-FR";
    m.continuous = true;
    m.interimResults = false;

    m.onresult = (e) => {
      let texte = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) texte += e.results[i][0].transcript;
      }
      if (texte.trim()) callback.current(texte.trim());
    };

    m.onerror = (e) => {
      setEnCours(false);
      setErreur(
        e.error === "not-allowed"
          ? "Le micro n'est pas autorisé. Autorisez-le dans votre navigateur, ou écrivez le récit."
          : "La dictée n'a pas fonctionné. Vous pouvez écrire le récit.",
      );
    };

    m.onend = () => setEnCours(false);

    moteur.current = m;
    m.start();
    setEnCours(true);
  }, []);

  const arreter = useCallback(() => {
    moteur.current?.stop();
    setEnCours(false);
  }, []);

  return { disponible, enCours, erreur, demarrer, arreter };
}
