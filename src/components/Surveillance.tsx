"use client";

import { Carte } from "./Interface";
import { surveillancePourAge } from "@/lib/surveillance";

/**
 * Ce qu'il faut surveiller à son âge.
 *
 * L'agent le lit à la patiente au moment où aucun signe inquiétant n'a été
 * relevé : la consultation ne débouche alors sur aucun soin, et la seule chose
 * utile à dire est « voici ce qu'il faut surveiller, et quand ». Le calendrier
 * vient de l'équipe Siira (`lib/surveillance.ts`).
 */
export function SurveillanceTexte({ age }: { age: number }) {
  const { maintenant, ensuite } = surveillancePourAge(age);

  return (
    <>
      <p className="text-[0.95rem] leading-relaxed text-prune-800">{maintenant}</p>
      {ensuite ? <p className="mt-2 text-sm text-sable-600">{ensuite}</p> : null}
    </>
  );
}

/** La même chose, dans sa propre carte, pour l'écran de résultat. */
export function SurveillanceRecommandee({ age }: { age: number }) {
  return (
    <Carte>
      <h2 className="mb-2 text-lg">Surveillance à son âge</h2>
      <SurveillanceTexte age={age} />
    </Carte>
  );
}
