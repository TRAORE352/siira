import { describe, it, expect } from "vitest";
import { classer, ficheVide, REGLES } from "./regles";
import type { Fiche } from "./types";

function fiche(partiel: Partial<Fiche>): Fiche {
  return { ...ficheVide(), ...partiel };
}

describe("classer : cas obligatoires du dossier", () => {
  it("masse, 8 semaines, peau retractee, 41 ans : rouge R1 et R5", () => {
    const r = classer({
      age: 41,
      fiche: fiche({ masse: true, duree_semaines: 8, peau: ["retraction"] }),
    });
    expect(r.niveau).toBe("rouge");
    expect(r.codes).toContain("R1");
    expect(r.codes).toContain("R5");
  });

  it("masse mobile, 1 semaine, 34 ans : orange O1", () => {
    const r = classer({
      age: 34,
      fiche: fiche({ masse: true, duree_semaines: 1, masse_fixe: false }),
    });
    expect(r.niveau).toBe("orange");
    expect(r.codes).toContain("O1");
    expect(r.codes).not.toContain("R5");
  });

  it("douleur cyclique des deux seins, pas de masse, 28 ans : vert V1", () => {
    const r = classer({
      age: 28,
      fiche: fiche({ masse: false, douleur: "deux_seins_cyclique" }),
    });
    expect(r.niveau).toBe("vert");
    expect(r.codes).toEqual(["V1"]);
  });

  it("masse et ganglion sous l'aisselle, 25 ans : rouge R2", () => {
    const r = classer({
      age: 25,
      fiche: fiche({ masse: true, ganglion_aisselle: true, duree_semaines: 2 }),
    });
    expect(r.niveau).toBe("rouge");
    expect(r.codes).toContain("R2");
  });

  it("ecoulement sanglant d'un cote, pas de masse, 50 ans : rouge R3", () => {
    const r = classer({
      age: 50,
      fiche: fiche({
        masse: false,
        ecoulement: "sanglant",
        ecoulement_un_cote: true,
      }),
    });
    expect(r.niveau).toBe("rouge");
    expect(r.codes).toContain("R3");
  });

  it("masse dure et fixe depuis 1 semaine, 22 ans : rouge R4", () => {
    const r = classer({
      age: 22,
      fiche: fiche({
        masse: true,
        masse_dure: true,
        masse_fixe: true,
        duree_semaines: 1,
      }),
    });
    expect(r.niveau).toBe("rouge");
    expect(r.codes).toContain("R4");
  });

  it("masse inconnue et douleur localisee 2 semaines, 45 ans : orange M1", () => {
    const r = classer({
      age: 45,
      fiche: fiche({ masse: null, douleur: "localisee", duree_semaines: 2 }),
    });
    expect(r.niveau).toBe("orange");
    expect(r.codes).toContain("M1");
    expect(r.champ_a_completer).toBe("masse");
  });

  it("retraction recente du mamelon seule, 60 ans : orange O2", () => {
    const r = classer({
      age: 60,
      fiche: fiche({ masse: false, mamelon_retraction_recente: true }),
    });
    expect(r.niveau).toBe("orange");
    expect(r.codes).toContain("O2");
  });
});

describe("classer : regles prises une par une", () => {
  it("O3 : ecoulement non sanglant d'un seul cote", () => {
    const r = classer({
      age: 30,
      fiche: fiche({
        masse: false,
        ecoulement: "non_sanglant",
        ecoulement_un_cote: true,
      }),
    });
    expect(r.niveau).toBe("orange");
    expect(r.codes).toContain("O3");
  });

  it("O4 : signe cutane sans masse", () => {
    const r = classer({ age: 30, fiche: fiche({ masse: false, peau: ["rougeur"] }) });
    expect(r.niveau).toBe("orange");
    expect(r.codes).toContain("O4");
    expect(r.codes).not.toContain("R1");
  });

  it("O5 : douleur localisee depuis 4 semaines", () => {
    const r = classer({
      age: 30,
      fiche: fiche({ masse: false, douleur: "localisee", duree_semaines: 4 }),
    });
    expect(r.niveau).toBe("orange");
    expect(r.codes).toContain("O5");
  });

  it("R5 ne se declenche pas avant 30 ans", () => {
    const r = classer({
      age: 29,
      fiche: fiche({ masse: true, duree_semaines: 12 }),
    });
    expect(r.niveau).toBe("orange");
    expect(r.codes).not.toContain("R5");
  });

  it("R5 ne se declenche pas sous 4 semaines", () => {
    const r = classer({
      age: 55,
      fiche: fiche({ masse: true, duree_semaines: 3 }),
    });
    expect(r.niveau).toBe("orange");
    expect(r.codes).not.toContain("R5");
  });

  it("ecoulement sanglant des deux cotes ne declenche pas R3", () => {
    const r = classer({
      age: 40,
      fiche: fiche({
        masse: false,
        ecoulement: "sanglant",
        ecoulement_un_cote: false,
      }),
    });
    expect(r.codes).not.toContain("R3");
    expect(r.niveau).toBe("vert");
  });

  it("une duree inconnue n'empeche pas le classement", () => {
    const r = classer({
      age: 45,
      fiche: fiche({ masse: true, duree_semaines: null }),
    });
    expect(r.niveau).toBe("orange");
    expect(r.codes).toContain("O1");
  });
});

describe("classer : garanties generales", () => {
  it("une fiche entierement vide ne peut pas etre verte", () => {
    const r = classer({ age: 40, fiche: ficheVide() });
    expect(r.niveau).toBe("orange");
    expect(r.champ_a_completer).toBe("masse");
  });

  it("le delai suit toujours le niveau", () => {
    expect(classer({ age: 41, fiche: fiche({ masse: true, peau: ["ulceration"] }) }).delai_jours).toBe(7);
    expect(classer({ age: 20, fiche: fiche({ masse: true }) }).delai_jours).toBe(30);
    expect(classer({ age: 20, fiche: fiche({ masse: false }) }).delai_jours).toBe(90);
  });

  it("chaque code de regle est unique", () => {
    const codes = REGLES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("une regle qui leve une erreur ne fait pas tomber le classement", () => {
    // La fiche est volontairement incoherente : peau non initialisee.
    const abimee = { ...ficheVide(), peau: undefined as unknown as [] };
    expect(() => classer({ age: 40, fiche: abimee })).not.toThrow();
  });
});
