import { describe, it, expect } from "vitest";
import { choisirCentre, distanceKm, joursEntre, EXAMENS_REQUIS } from "./matching";
import type { Centre, Creneau, District } from "./types";

const saaba: District = {
  id: "d-saaba",
  nom: "Saaba",
  latitude: 12.3833,
  longitude: -1.4,
};

const AUJ = new Date("2026-10-15T08:00:00.000Z");

function centre(p: Partial<Centre> & { id: string }): Centre {
  return {
    nom: p.id,
    service: "Oncologie",
    latitude: 12.35,
    longitude: -1.5,
    examens: ["echographie", "biopsie"],
    places_semaine: 10,
    actif: true,
    ...p,
  };
}

/** Cree n creneaux libres a partir de j jours apres aujourd'hui. */
function creneaux(centreId: string, jours: number[], libre = true): Creneau[] {
  return jours.map((j, i) => ({
    id: `${centreId}-${i}`,
    centre_id: centreId,
    debut: new Date(AUJ.getTime() + j * 24 * 3600 * 1000).toISOString(),
    libre,
  }));
}

describe("outils geographiques", () => {
  it("la distance Ouagadougou - Bobo-Dioulasso est d'environ 330 km a vol d'oiseau", () => {
    const ouaga = { latitude: 12.3714, longitude: -1.5197 };
    const bobo = { latitude: 11.1771, longitude: -4.2979 };
    const d = distanceKm(ouaga, bobo);
    // 360 km par la route, environ 330 km a vol d'oiseau.
    expect(d).toBeGreaterThan(320);
    expect(d).toBeLessThan(340);
  });

  it("la distance d'un point a lui-meme est nulle", () => {
    expect(distanceKm(saaba, saaba)).toBe(0);
  });

  it("joursEntre compte des jours entiers", () => {
    expect(joursEntre(new Date("2026-10-15T23:00:00Z"), new Date("2026-10-16T01:00:00Z"))).toBe(1);
    expect(joursEntre(AUJ, AUJ)).toBe(0);
  });
});

describe("filtre par examens", () => {
  it("un cas rouge exige echographie ET biopsie", () => {
    expect(EXAMENS_REQUIS.rouge).toEqual(["echographie", "biopsie"]);
    const sansBiopsie = centre({ id: "c1", examens: ["echographie"] });
    const r = choisirCentre({
      niveau: "rouge",
      district: saaba,
      centres: [sansBiopsie],
      creneaux: creneaux("c1", [1]),
      aujourdhui: AUJ,
    });
    expect(r.proposition).toBeNull();
  });

  it("un cas orange se contente de l'echographie", () => {
    const sansBiopsie = centre({ id: "c1", examens: ["echographie"] });
    const r = choisirCentre({
      niveau: "orange",
      district: saaba,
      centres: [sansBiopsie],
      creneaux: creneaux("c1", [2]),
      aujourdhui: AUJ,
    });
    expect(r.proposition?.centre.id).toBe("c1");
  });

  it("un centre inactif est ecarte", () => {
    const r = choisirCentre({
      niveau: "rouge",
      district: saaba,
      centres: [centre({ id: "c1", actif: false })],
      creneaux: creneaux("c1", [1]),
      aujourdhui: AUJ,
    });
    expect(r.proposition).toBeNull();
  });
});

describe("filtre par delai", () => {
  it("un rouge refuse un creneau a plus de 7 jours quand un autre tient le delai", () => {
    const r = choisirCentre({
      niveau: "rouge",
      district: saaba,
      centres: [centre({ id: "loin" }), centre({ id: "proche" })],
      creneaux: [...creneaux("loin", [20]), ...creneaux("proche", [3])],
      aujourdhui: AUJ,
    });
    expect(r.proposition?.centre.id).toBe("proche");
    expect(r.aucun_dans_le_delai).toBe(false);
    expect(r.alternatives).toHaveLength(1);
  });

  it("aucun centre dans le delai : le plus proche est propose hors delai", () => {
    const r = choisirCentre({
      niveau: "rouge",
      district: saaba,
      centres: [
        centre({ id: "tres-loin", latitude: 11.17, longitude: -4.29 }),
        centre({ id: "assez-pres", latitude: 12.4, longitude: -1.45 }),
      ],
      creneaux: [...creneaux("tres-loin", [10]), ...creneaux("assez-pres", [25])],
      aujourdhui: AUJ,
    });
    expect(r.aucun_dans_le_delai).toBe(true);
    expect(r.proposition?.centre.id).toBe("assez-pres");
    expect(r.proposition?.hors_delai).toBe(true);
  });

  it("un creneau deja pris est ignore", () => {
    const r = choisirCentre({
      niveau: "orange",
      district: saaba,
      centres: [centre({ id: "c1" })],
      creneaux: [...creneaux("c1", [2], false), ...creneaux("c1", [9])],
      aujourdhui: AUJ,
    });
    expect(r.proposition?.jours_attente).toBe(9);
  });

  it("un creneau passe est ignore", () => {
    const r = choisirCentre({
      niveau: "orange",
      district: saaba,
      centres: [centre({ id: "c1" })],
      creneaux: creneaux("c1", [-5, 6]),
      aujourdhui: AUJ,
    });
    expect(r.proposition?.jours_attente).toBe(6);
  });

  it("aucun centre du tout : proposition nulle", () => {
    const r = choisirCentre({
      niveau: "rouge",
      district: saaba,
      centres: [],
      creneaux: [],
      aujourdhui: AUJ,
    });
    expect(r.proposition).toBeNull();
    expect(r.alternatives).toEqual([]);
  });
});

describe("calcul du score", () => {
  it("un centre sur place, disponible demain, a plein de places, frole 100", () => {
    const parfait = centre({
      id: "parfait",
      latitude: saaba.latitude,
      longitude: saaba.longitude,
      places_semaine: 3,
    });
    const r = choisirCentre({
      niveau: "rouge",
      district: saaba,
      centres: [parfait],
      creneaux: creneaux("parfait", [0, 1, 2]),
      aujourdhui: AUJ,
    });
    expect(r.proposition?.score).toBeGreaterThan(95);
    expect(r.proposition?.detail.proximite).toBe(1);
    expect(r.proposition?.detail.capacite).toBe(1);
  });

  it("le score reste entre 0 et 100", () => {
    const r = choisirCentre({
      niveau: "orange",
      district: saaba,
      centres: [centre({ id: "c1", latitude: 11.17, longitude: -4.29, places_semaine: 50 })],
      creneaux: creneaux("c1", [29]),
      aujourdhui: AUJ,
    });
    const s = r.proposition!.score;
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it("a score egal, le plus proche passe devant", () => {
    const a = centre({ id: "a", latitude: 12.6, longitude: -1.4, places_semaine: 1 });
    const b = centre({ id: "b", latitude: 12.39, longitude: -1.4, places_semaine: 1 });
    const r = choisirCentre({
      niveau: "orange",
      district: saaba,
      centres: [a, b],
      creneaux: [...creneaux("a", [5]), ...creneaux("b", [5])],
      aujourdhui: AUJ,
    });
    expect(r.proposition?.centre.id).toBe("b");
    expect(r.alternatives.map((p) => p.centre.id)).toEqual(["b", "a"]);
  });

  it("les alternatives sont triees par score decroissant", () => {
    const r = choisirCentre({
      niveau: "orange",
      district: saaba,
      centres: [
        centre({ id: "c1", latitude: 12.9, longitude: -1.9 }),
        centre({ id: "c2", latitude: 12.39, longitude: -1.41 }),
        centre({ id: "c3", latitude: 12.6, longitude: -1.6 }),
      ],
      creneaux: [...creneaux("c1", [2]), ...creneaux("c2", [2]), ...creneaux("c3", [2])],
      aujourdhui: AUJ,
    });
    const scores = r.alternatives.map((p) => p.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
  });

  it("un centre sans place declaree ne fait pas tomber le calcul", () => {
    const r = choisirCentre({
      niveau: "orange",
      district: saaba,
      centres: [centre({ id: "c1", places_semaine: 0 })],
      creneaux: creneaux("c1", [3]),
      aujourdhui: AUJ,
    });
    expect(r.proposition?.detail.capacite).toBe(0);
    expect(Number.isFinite(r.proposition!.score)).toBe(true);
  });
});
