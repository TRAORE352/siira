/**
 * Surveillance recommandée selon l'âge.
 *
 * Source : le calendrier transmis par l'équipe Siira (conférence d'octobre
 * 2026, Ouagadougou) —
 *
 *   dès 20 ans : autopalpation des seins chaque mois ;
 *   dès 35 ans : autopalpation mensuelle + examen médical des seins chaque
 *                année ;
 *   dès 40 ans : mammographie tous les trois ans ;
 *   dès 50 ans : mammographie tous les deux ans.
 *
 * Ces repères sont **à valider par une professionnelle de santé** avant tout
 * usage réel, comme les règles de classement (voir `DECISIONS.md`, D43).
 *
 * Ce que dit l'OMS, pour mémoire (fiche « Cancer du sein », juillet 2026) :
 * le dépistage par mammographie porte sur les femmes « généralement âgées de
 * 50 à 69 ans », et l'OMS ne retient pas l'auto-examen comme méthode de
 * dépistage — elle insiste sur la connaissance des signes et la consultation
 * sans attendre, ce que fait déjà Siira. Le calendrier ci-dessus est donc plus
 * proactif que la recommandation mondiale : il vient du terrain, il est
 * affiché comme une invitation à surveiller, jamais comme un diagnostic.
 */

export interface Surveillance {
  /** Ce qu'il faut faire à son âge, aujourd'hui. */
  maintenant: string;
  /** L'étape suivante, avec l'âge où elle commence. Rien après 50 ans. */
  ensuite: string | null;
}

const AUTOPALPATION = "Autopalpation des seins chaque mois";
const EXAMEN_ANNUEL = "examen des seins par un professionnel chaque année";
const MAMMOGRAPHIE_TROIS = "mammographie tous les trois ans";
const MAMMOGRAPHIE_DEUX = "mammographie tous les deux ans";

/** Une phrase, jamais une liste à puces : l'agent la lit à la patiente. */
function phrase(morceaux: string[]): string {
  const tete = morceaux.slice(0, -1).join(", ");
  const queue = morceaux[morceaux.length - 1];
  return morceaux.length === 1 ? `${queue}.` : `${tete} et ${queue}.`;
}

export function surveillancePourAge(age: number): Surveillance {
  if (age < 20) {
    return {
      maintenant: "Aucun examen des seins n'est recommandé avant 20 ans.",
      ensuite: `À 20 ans : ${AUTOPALPATION.toLowerCase()}.`,
    };
  }

  if (age < 35) {
    return {
      maintenant: phrase([AUTOPALPATION]),
      ensuite: `À 35 ans : ${EXAMEN_ANNUEL}.`,
    };
  }

  if (age < 40) {
    return {
      maintenant: phrase([AUTOPALPATION, EXAMEN_ANNUEL]),
      ensuite: `À 40 ans : ${MAMMOGRAPHIE_TROIS}.`,
    };
  }

  if (age < 50) {
    return {
      maintenant: phrase([AUTOPALPATION, EXAMEN_ANNUEL, MAMMOGRAPHIE_TROIS]),
      ensuite: `À 50 ans : ${MAMMOGRAPHIE_DEUX}.`,
    };
  }

  return {
    maintenant: phrase([AUTOPALPATION, EXAMEN_ANNUEL, MAMMOGRAPHIE_DEUX]),
    ensuite: null,
  };
}
