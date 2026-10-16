// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { fermerSession, lireSession, ouvrirSession, ouvrirSessionReelle } from "./session";
import type { Profil } from "./types";

/*
 * Ce que ces essais ferment : la session ne retenait qu'un IDENTIFIANT, puis
 * relisait le profil dans les referentiels de DEMONSTRATION. Un compte reel
 * n'y figure jamais. L'agent s'authentifiait donc correctement — jeton,
 * profil, role, tout en 200 — puis le garde de l'espace ne retrouvait pas son
 * profil, le prenait pour un visiteur et le renvoyait vers /connexion.
 *
 * Le symptome est le pire possible : l'ecran de connexion reste affiche, sans
 * aucun message d'erreur, et rien n'a echoue. Impossible a diagnostiquer de
 * l'exterieur, et c'est exactement le mode qui compte le jour de la demo.
 */

const PROFIL_REEL: Profil = {
  id: "481bb498-11d0-4146-8f4d-00900da5ee70",
  nom: "KABORE",
  prenoms: "Salif",
  role: "agent",
  statut: "infirmier_etat",
  matricule: "AG1042",
  centre_sante: "CSPS de Dassasgho",
  email: "",
  centre_id: null,
  ong_id: null,
};

describe("session d'un compte reel", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("retrouve un profil qui n'existe dans AUCUN referentiel local", () => {
    ouvrirSessionReelle(PROFIL_REEL);
    const lu = lireSession();
    expect(lu).not.toBeNull();
    expect(lu?.matricule).toBe("AG1042");
    expect(lu?.role).toBe("agent");
  });

  it("un identifiant seul ne suffit pas pour un compte reel", () => {
    /* L'ancien comportement : c'est precisement ce qui cassait la connexion. */
    ouvrirSession(PROFIL_REEL.id);
    expect(lireSession()).toBeNull();
  });

  it("la fermeture efface le profil reel, pas seulement l'identifiant", () => {
    ouvrirSessionReelle(PROFIL_REEL);
    fermerSession();
    /* Un profil laisse derriere rouvrirait la session a la lecture suivante,
       et la deconnexion ne deconnecterait pas. */
    expect(lireSession()).toBeNull();
  });

  it("une entree abimee ne fait pas boucler la lecture", () => {
    window.sessionStorage.setItem("siira.profil.v1", "{ceci n'est pas du JSON");
    expect(lireSession()).toBeNull();
    expect(window.sessionStorage.getItem("siira.profil.v1")).toBeNull();
  });
});
