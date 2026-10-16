import { describe, expect, it } from "vitest";
import { matriculeNormalise, validerInscription } from "./comptes";
import type { Inscription } from "./comptes";

const BONNE: Inscription = {
  nom: "Ouédraogo",
  prenom: "Salimata",
  statut: "infirmier_etat",
  centre_sante: "Centre de santé de Saaba",
  matricule: "AG-1042",
  mot_de_passe: "418209",
  confirmation: "418209",
};

function fautes(partiel: Partial<Inscription>, pris: string[] = []) {
  return validerInscription({ ...BONNE, ...partiel }, pris);
}

describe("matriculeNormalise", () => {
  it("ignore la casse et les espaces", () => {
    expect(matriculeNormalise(" ag 1042 ")).toBe("AG1042");
  });
});

describe("validerInscription", () => {
  it("accepte une inscription complète", () => {
    expect(validerInscription(BONNE)).toEqual({});
  });

  it("réclame chaque champ obligatoire", () => {
    const f = validerInscription({
      nom: "",
      prenom: "",
      statut: "",
      centre_sante: "",
      matricule: "",
      mot_de_passe: "",
      confirmation: "",
    });
    expect(Object.keys(f).sort()).toEqual([
      "centre_sante",
      "confirmation",
      "matricule",
      "mot_de_passe",
      "nom",
      "prenom",
      "statut",
    ]);
    expect(f.nom).toContain("nom");
    expect(f.statut).toContain("statut");
  });

  it("veut un mot de passe de six chiffres", () => {
    expect(fautes({ mot_de_passe: "12345", confirmation: "12345" }).mot_de_passe).toContain(
      "6 chiffres",
    );
    expect(fautes({ mot_de_passe: "abcdef", confirmation: "abcdef" }).mot_de_passe).toContain(
      "6 chiffres",
    );
    expect(fautes({ mot_de_passe: "123456", confirmation: "123456" })).toEqual({});
  });

  it("veut deux mots de passe identiques", () => {
    expect(fautes({ confirmation: "000000" }).confirmation).toContain("identiques");
  });

  it("refuse un matricule déjà pris, quelle que soit l'écriture", () => {
    expect(fautes({ matricule: "ag 1042" }, ["AG-1042"]).matricule).toContain("déjà");
  });

  it("refuse un matricule trop court ou hors des lettres et chiffres", () => {
    expect(fautes({ matricule: "A1" }).matricule).toContain("4 à 12");
    expect(fautes({ matricule: "AG 10@2" }).matricule).toContain("4 à 12");
    expect(fautes({ matricule: "AG-1042999999" }).matricule).toContain("4 à 12");
  });

  it("accepte les noms avec accents, apostrophes et tirets", () => {
    expect(fautes({ nom: "Nikièma" })).toEqual({});
    expect(fautes({ nom: "Oue'draogo" })).toEqual({});
    expect(fautes({ prenom: "Awa-Zoé" })).toEqual({});
    expect(fautes({ nom: "A" }).nom).toContain("court");
  });
});
