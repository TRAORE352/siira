import { describe, expect, it } from "vitest";
import { surveillancePourAge } from "./surveillance";

describe("surveillancePourAge", () => {
  it("ne recommande rien avant 20 ans, et annonce le premier repère", () => {
    const s = surveillancePourAge(17);
    expect(s.maintenant).toContain("avant 20 ans");
    expect(s.ensuite).toContain("20 ans");
  });

  it("recommande l'autopalpation mensuelle dès 20 ans", () => {
    expect(surveillancePourAge(20).maintenant).toBe(
      "Autopalpation des seins chaque mois.",
    );
    expect(surveillancePourAge(34).ensuite).toContain("35 ans");
  });

  it("ajoute l'examen annuel dès 35 ans", () => {
    const s = surveillancePourAge(35);
    expect(s.maintenant).toContain("chaque mois");
    expect(s.maintenant).toContain("chaque année");
    expect(s.ensuite).toContain("40 ans");
  });

  it("ajoute la mammographie tous les trois ans dès 40 ans", () => {
    const s = surveillancePourAge(41);
    expect(s.maintenant).toContain("tous les trois ans");
    expect(s.ensuite).toContain("50 ans");
    /* La phrase reste lisible à voix haute : une seule, pas une liste. */
    expect(s.maintenant.split(".").filter(Boolean)).toHaveLength(1);
  });

  it("passe la mammographie à tous les deux ans dès 50 ans, et s'arrête là", () => {
    const s = surveillancePourAge(50);
    expect(s.maintenant).toContain("tous les deux ans");
    expect(s.maintenant).not.toContain("trois ans");
    expect(s.ensuite).toBeNull();
    expect(surveillancePourAge(75).ensuite).toBeNull();
  });

  it("couvre tous les âges de la fiche, de 15 à 100 ans", () => {
    for (let age = 15; age <= 100; age += 1) {
      const s = surveillancePourAge(age);
      expect(s.maintenant.length).toBeGreaterThan(10);
      if (age >= 50) expect(s.maintenant).toContain("deux ans");
    }
  });
});
