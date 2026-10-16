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
  it("reconnaît les deux espaces dédiés", () => {
    expect(lireEspace("agent")).toBe("agent");
    expect(lireEspace("centre")).toBe("centre");
  });

  it("accepte la casse et les espaces autour", () => {
    expect(lireEspace("  Agent ")).toBe("agent");
    expect(lireEspace("CENTRE")).toBe("centre");
  });

  it("retombe sur l'application complète quand rien n'est déclaré", () => {
    expect(lireEspace(undefined)).toBe("complet");
    expect(lireEspace("")).toBe("complet");
    expect(lireEspace("   ")).toBe("complet");
  });

  it("refuse une valeur inconnue plutôt que d'ouvrir un espace", () => {
    expect(lireEspace("patient")).toBe("complet");
    expect(lireEspace("tous")).toBe("complet");
    expect(lireEspace("agent; drop")).toBe("complet");
  });

  /*
   * Le cas le plus dangereux : une adresse survit a son espace. La variable
   * vit chez l'hebergeur, personne ne la retire avec le code. Si « ong »
   * etait traite comme inconnu, l'ancienne adresse ouvrirait l'application
   * COMPLETE — donc tous les ecrans de l'agent et du centre.
   */
  it("« ong » ferme l'adresse, il ne l'ouvre pas en grand", () => {
    expect(lireEspace("ong")).toBe("ferme");
    expect(lireEspace("ONG")).toBe("ferme");
    expect(lireEspace(" ong ")).toBe("ferme");
  });
});

describe("rolesEspace", () => {
  it("l'application complète admet tous les rôles", () => {
    expect(rolesEspace("complet").sort()).toEqual([...ROLES].sort());
  });

  it("une adresse fermée n'admet aucun rôle", () => {
    expect(rolesEspace("ferme")).toEqual([]);
    for (const role of ROLES) {
      expect(roleAutorise("ferme", role)).toBe(false);
    }
  });

  it("la plateforme ne connaît plus le rôle ONG", () => {
    expect(ROLES).not.toContain("ong");
    expect(ROLES).toEqual(["agent", "centre", "admin"]);
  });

  it("une adresse dédiée n'admet que son rôle", () => {
    expect(rolesEspace("agent")).toEqual(["agent"]);
    expect(rolesEspace("centre")).toEqual(["centre"]);
  });

  it("l'agent n'accède pas à l'espace du centre, ni l'inverse", () => {
    expect(roleAutorise("centre", "agent")).toBe(false);
    expect(roleAutorise("agent", "centre")).toBe(false);
    expect(roleAutorise("agent", "agent")).toBe(true);
    expect(roleAutorise("centre", "admin")).toBe(false);
    expect(roleAutorise("complet", "admin")).toBe(true);
  });
});

describe("cheminAutorise", () => {
  it("l'application complète ouvre tous les chemins", () => {
    for (const chemin of ["/", "/connexion", "/agent", "/centre", "/admin", "/design"]) {
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
    expect(cheminAutorise("agent", "/agent/patientes")).toBe(true);
    expect(cheminAutorise("agent", "/agent/consultation/nouvelle")).toBe(true);
    expect(cheminAutorise("agent", "/agent/patiente/pat-1")).toBe(true);
  });

  it("l'espace agent refuse les écrans du centre, de l'admin et du design", () => {
    for (const chemin of ["/centre", "/centre/dossier/ori-1", "/admin", "/design"]) {
      expect(cheminAutorise("agent", chemin)).toBe(false);
    }
  });

  it("l'espace centre refuse les écrans de l'agent", () => {
    expect(cheminAutorise("centre", "/centre")).toBe(true);
    expect(cheminAutorise("centre", "/centre/disponibilites")).toBe(true);
    expect(cheminAutorise("centre", "/agent")).toBe(false);
  });

  /* L'adresse de l'équipe : la console, et rien d'autre. */
  it("l'espace équipe n'ouvre que sa console", () => {
    expect(cheminAutorise("admin", "/admin")).toBe(true);
    expect(cheminAutorise("admin", "/admin/comptes")).toBe(true);
    expect(cheminAutorise("admin", "/admin/centres")).toBe(true);
    expect(cheminAutorise("admin", "/agent")).toBe(false);
    expect(cheminAutorise("admin", "/centre")).toBe(false);
    expect(cheminAutorise("admin", "/design")).toBe(false);
  });

  it("« equipe » et « admin » désignent le même espace", () => {
    expect(lireEspace("equipe")).toBe("admin");
    expect(lireEspace("admin")).toBe("admin");
    expect(roleAutorise(lireEspace("equipe"), "admin")).toBe(true);
    expect(roleAutorise(lireEspace("equipe"), "agent")).toBe(false);
  });

  /*
   * Les écrans de l'ONG ont été supprimés. Une adresse enregistrée dans un
   * téléphone ou un favori ne doit mener nulle part, sur aucun espace.
   */
  it("les anciens écrans de l'ONG ne sont ouverts par aucune adresse dédiée", () => {
    for (const chemin of ["/ong", "/ong/regles", "/ong/impact"]) {
      expect(cheminAutorise("agent", chemin)).toBe(false);
      expect(cheminAutorise("centre", chemin)).toBe(false);
    }
  });

  /*
   * Une adresse fermee ne doit rien ouvrir, pas meme la connexion : un
   * formulaire qui ne mene nulle part est pire qu'un refus clair.
   */
  it("une adresse fermée n'ouvre que sa racine, qui explique la situation", () => {
    expect(cheminAutorise("ferme", "/")).toBe(true);
    for (const chemin of [
      "/connexion",
      "/agent",
      "/agent/consultation/nouvelle",
      "/centre",
      "/admin",
      "/design",
      "/ong",
    ]) {
      expect(cheminAutorise("ferme", chemin)).toBe(false);
    }
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
    expect(accueilEspace("complet")).toBe("/");
  });

  it("un écran refusé renvoie vers la connexion sur une adresse dédiée", () => {
    expect(cheminRefus("agent")).toBe("/connexion");
    expect(cheminRefus("centre")).toBe("/connexion");
    expect(cheminRefus("complet")).toBe("/");
  });
});

describe("comptesDeLespace", () => {
  const espaces: Espace[] = ["agent", "centre", "complet"];

  it("ne propose que des comptes du bon rôle", () => {
    expect(comptesDeLespace("agent", PROFILS).map((p) => p.role)).toEqual([
      "agent",
      "agent",
      "agent",
    ]);
    expect(comptesDeLespace("centre", PROFILS).map((p) => p.role)).toEqual([
      "centre",
      "centre",
      "centre",
      "centre",
    ]);
  });

  /* Plus aucun compte ONG ne doit pouvoir se connecter, nulle part. */
  it("aucun compte ONG ne subsiste", () => {
    expect(PROFILS.some((p) => p.role === "ong" as string)).toBe(false);
    for (const espace of espaces) {
      expect(
        comptesDeLespace(espace, PROFILS).some((p) => p.ong_id !== null),
      ).toBe(false);
    }
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
    const centres = new Set(comptesDeLespace("centre", PROFILS).map((p) => p.id));
    for (const id of centres) expect(agents.has(id)).toBe(false);
  });
});
