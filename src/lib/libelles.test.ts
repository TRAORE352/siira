import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { depuis, depuisCourt } from "./libelles";

/* Une date de référence fixe : sinon le test change de résultat le jour où on
   le lance, ce qui est exactement le genre de test qu'on finit par ignorer. */
const MAINTENANT = new Date("2026-10-15T09:00:00.000Z");

function ilYa(jours: number, heures = 0): string {
  return new Date(MAINTENANT.getTime() - jours * 86400000 - heures * 3600000).toISOString();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MAINTENANT);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("depuis", () => {
  it("dit aujourd'hui pour un dossier du jour", () => {
    expect(depuis(ilYa(0, 3))).toBe("aujourd'hui");
  });

  it("dit hier pour un dossier de la veille", () => {
    expect(depuis(ilYa(1))).toBe("hier");
  });

  it("compte en jours jusqu'à six", () => {
    expect(depuis(ilYa(3))).toBe("il y a 3 jours");
    expect(depuis(ilYa(6))).toBe("il y a 6 jours");
  });

  /* Le defaut d'origine : « il y a 1 semaines » s'affichait sur deux cartes
     de l'accueil de l'agent, pour toute consultation de 7 a 13 jours. */
  it("accorde la semaine au singulier", () => {
    expect(depuis(ilYa(7))).toBe("il y a 1 semaine");
    expect(depuis(ilYa(11))).toBe("il y a 1 semaine");
    expect(depuis(ilYa(13))).toBe("il y a 1 semaine");
  });

  it("accorde la semaine au pluriel", () => {
    expect(depuis(ilYa(14))).toBe("il y a 2 semaines");
    expect(depuis(ilYa(23))).toBe("il y a 3 semaines");
  });

  it("passe aux mois à partir de trente et un jours", () => {
    expect(depuis(ilYa(30))).toBe("il y a 4 semaines");
    expect(depuis(ilYa(31))).toBe("il y a 1 mois");
    expect(depuis(ilYa(75))).toBe("il y a 2 mois");
  });

  it("ne descend jamais sous aujourd'hui, même pour une date à venir", () => {
    expect(depuis(new Date(MAINTENANT.getTime() + 86400000).toISOString())).toBe(
      "aujourd'hui",
    );
  });
});

describe("depuisCourt", () => {
  it("reste lisible dans une colonne de 238 px", () => {
    expect(depuisCourt(ilYa(0))).toBe("auj.");
    expect(depuisCourt(ilYa(1))).toBe("hier");
    expect(depuisCourt(ilYa(4))).toBe("4 j");
    expect(depuisCourt(ilYa(11))).toBe("1 sem.");
    expect(depuisCourt(ilYa(23))).toBe("3 sem.");
    expect(depuisCourt(ilYa(40))).toBe("1 mois");
  });

  it("compte les mêmes jours que la forme longue", () => {
    for (const jours of [0, 1, 2, 6, 7, 13, 14, 30, 31, 61, 400]) {
      const long = depuis(ilYa(jours));
      const court = depuisCourt(ilYa(jours));
      const nombreLong = long.match(/\d+/)?.[0] ?? "0";
      const nombreCourt = court.match(/\d+/)?.[0] ?? "0";
      if (jours > 1 && jours < 31) expect(nombreCourt).toBe(nombreLong);
    }
  });

  it("reste plus court que la forme longue", () => {
    for (const jours of [2, 7, 11, 23, 40, 100]) {
      expect(depuisCourt(ilYa(jours)).length).toBeLessThan(depuis(ilYa(jours)).length);
    }
  });
});
