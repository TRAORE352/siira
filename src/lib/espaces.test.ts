/**
 * Espaces de Siira : vérification des règles d'accès.
 *
 * Ces fonctions décident sur quelle adresse un rôle est admis et quels écrans
 * sont ouverts. Elles sont pures : l'espace est passé en argument, donc chaque
 * déploiement est vérifiable sans reconstruire l'application.
 */

import { describe, expect, it } from "vitest";
import {
  ACCUEIL_PAR_ROLE,
  CHEMINS_PUBLICS,
  ROLES,
  accueilEspace,
  cheminAutorise,
  cheminRefus,
  comptesDeLespace,
  lireEspace,
  roleAutorise,
  rolesEspace,
  type Espace,
} from "./espaces";
import { PROFILS } from "./demo";

describe("lireEspace", () => {
  it("reconnaît les trois espaces dédiés", () => {
    expect(lireEspace("agent")).toBe("agent");
    expect(lireEspace("centre")).toBe("centre");
    expect(lireEspace("ong")).toBe("ong");
  });

  it("accepte la casse et les espaces autour", () => {
    expect(lireEspace("  Agent ")).toBe("agent");
    expect(lireEspace("ONG")).toBe("ong");
  });

  it("retombe sur l'application complète quand rien n'est déclaré", () => {
    expect(lireEspace(undefined)).toBe("complet");
    expect(lireEspace("")).toBe("complet");
    expect(lireEspace("   ")).toBe("complet");
  });

  it("refuse une valeur inconnue plutôt que d'ouvrir un espace", () => {
    expect(lireEspace("admin")).toBe("complet");
    expect(lireEspace("tous")).toBe("complet");
    expect(lireEspace("agent; drop")).toBe("complet");
  });
});

describe("rolesEspace", () => {
  it("l'application complète admet les quatre rôles", () => {
    expect(rolesEspace("complet").sort()).toEqual([...ROLES].sort());
  });

  it("une adresse dédiée n'admet que son rôle", () => {
    expect(rolesEspace("agent")).toEqual(["agent"]);
    expect(rolesEspace("centre")).toEqual(["centre"]);
    expect(rolesEspace("ong")).toEqual(["ong"]);
  });

  it("l'agent n'accède pas à l'espace ONG, ni l'inverse", () => {
    expect(roleAutorise("ong", "agent")).toBe(false);
    expect(roleAutorise("agent", "ong")).toBe(false);
    expect(roleAutorise("agent", "agent")).toBe(true);
    expect(roleAutorise("centre", "admin")).toBe(false);
    expect(roleAutorise("complet", "admin")).toBe(true);
  });
});

describe("cheminAutorise", () => {
  it("l'application complète ouvre tous les chemins", () => {
    for (const chemin of ["/", "/connexion", "/agent", "/centre", "/ong", "/admin", "/design"]) {
      expect(cheminAutorise("complet", chemin)).toBe(true);
    }
  });

  it("une adresse dédiée ouvre la racine et la connexion", () => {
    for (const chemin of CHEMINS_PUBLICS) {
      expect(cheminAutorise("agent", chemin)).toBe(true);
    }
  });

  it("l'espace agent ouvre ses écrans, y compris ceux des sous-dossiers", () => {
    expect(cheminAutorise("agent", "/agent")).toBe(true);
    expect(cheminAutorise("agent", "/agent/consultation/nouvelle")).toBe(true);
    expect(cheminAutorise("agent", "/agent/patiente/pat-1")).toBe(true);
  });

  it("l'espace agent refuse les écrans du centre, de l'ONG, de l'admin et du design", () => {
    for (const chemin of ["/centre", "/centre/dossier/ori-1", "/ong", "/ong/regles", "/admin", "/design"]) {
      expect(cheminAutorise("agent", chemin)).toBe(false);
    }
  });

  it("l'espace centre refuse les écrans de l'agent et de l'ONG", () => {
    expect(cheminAutorise("centre", "/centre")).toBe(true);
    expect(cheminAutorise("centre", "/centre/disponibilites")).toBe(true);
    expect(cheminAutorise("centre", "/agent")).toBe(false);
    expect(cheminAutorise("centre", "/ong/impact")).toBe(false);
  });

  it("l'espace ONG refuse les écrans de l'agent et du centre", () => {
    expect(cheminAutorise("ong", "/ong/impact")).toBe(true);
    expect(cheminAutorise("ong", "/agent")).toBe(false);
    expect(cheminAutorise("ong", "/centre")).toBe(false);
  });

  it("ne confond pas un préfixe voisin avec une autorisation", () => {
    expect(cheminAutorise("agent", "/agent-secret")).toBe(false);
    expect(cheminAutorise("centre", "/centres")).toBe(false);
  });
});

describe("accueilEspace et cheminRefus", () => {
  it("chaque espace a une adresse d'entrée claire", () => {
    expect(accueilEspace("agent")).toBe(ACCUEIL_PAR_ROLE.agent);
    expect(accueilEspace("centre")).toBe(ACCUEIL_PAR_ROLE.centre);
    expect(accueilEspace("ong")).toBe(ACCUEIL_PAR_ROLE.ong);
    expect(accueilEspace("complet")).toBe("/");
  });

  it("un écran refusé renvoie vers la connexion sur une adresse dédiée", () => {
    expect(cheminRefus("agent")).toBe("/connexion");
    expect(cheminRefus("ong")).toBe("/connexion");
    expect(cheminRefus("complet")).toBe("/");
  });
});

describe("comptesDeLespace", () => {
  const espaces: Espace[] = ["agent", "centre", "ong", "complet"];

  it("ne propose que des comptes du bon rôle", () => {
    expect(comptesDeLespace("agent", PROFILS).map((p) => p.role)).toEqual(["agent", "agent", "agent"]);
    expect(comptesDeLespace("centre", PROFILS).map((p) => p.role)).toEqual([
      "centre",
      "centre",
      "centre",
      "centre",
    ]);
    expect(comptesDeLespace("ong", PROFILS).map((p) => p.role)).toEqual(["ong", "ong"]);
  });

  it("l'application complète propose tous les comptes de démonstration", () => {
    expect(comptesDeLespace("complet", PROFILS)).toHaveLength(PROFILS.length);
    expect(comptesDeLespace("complet", PROFILS).some((p) => p.role === "admin")).toBe(true);
  });

  it("un espace dédié ne propose jamais le compte d'administration", () => {
    for (const espace of espaces) {
      if (espace === "complet") continue;
      expect(comptesDeLespace(espace, PROFILS).some((p) => p.role === "admin")).toBe(false);
    }
  });

  it("aucun compte d'un espace n'apparaît sur un autre espace", () => {
    const agents = new Set(comptesDeLespace("agent", PROFILS).map((p) => p.id));
    const ongs = new Set(comptesDeLespace("ong", PROFILS).map((p) => p.id));
    for (const id of ongs) expect(agents.has(id)).toBe(false);
  });
});
