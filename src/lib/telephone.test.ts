import { describe, expect, it } from "vitest";
import {
  chiffresSeuls,
  codeValide,
  erreurCode,
  erreurNumero,
  formaterNumero,
  numeroCanonique,
  numeroLisible,
  numeroValide,
  ressembleAMobile,
} from "./telephone";

describe("chiffresSeuls", () => {
  it("retire les espaces et la ponctuation", () => {
    expect(chiffresSeuls("70 12 34 56")).toBe("70123456");
    expect(chiffresSeuls("70-12.34/56")).toBe("70123456");
  });

  it("retire l'indicatif sous ses deux formes", () => {
    expect(chiffresSeuls("+226 70 12 34 56")).toBe("70123456");
    expect(chiffresSeuls("00226 70123456")).toBe("70123456");
  });

  it("ne confond pas un indicatif avec un numéro qui commence par 226", () => {
    // 8 chiffres exactement : c'est le numéro, pas un indicatif.
    expect(chiffresSeuls("22612345")).toBe("22612345");
  });

  it("ne garde jamais plus de 8 chiffres", () => {
    expect(chiffresSeuls("701234567890")).toHaveLength(8);
  });
});

describe("formaterNumero", () => {
  it("groupe les chiffres deux par deux", () => {
    expect(formaterNumero("70123456")).toBe("70 12 34 56");
  });

  it("formate aussi une saisie incomplète, sans espace en fin", () => {
    expect(formaterNumero("701")).toBe("70 1");
    expect(formaterNumero("7012")).toBe("70 12");
    expect(formaterNumero("")).toBe("");
  });
});

describe("erreurNumero", () => {
  it("accepte les préfixes mobiles du format actuel", () => {
    for (const n of ["01234567", "02345678", "03456789", "05123456", "06123456", "07123456"]) {
      expect(erreurNumero(n), n).toBeNull();
    }
  });

  it("accepte les anciens numéros en 5, 6 et 7", () => {
    for (const n of ["50123456", "60123456", "70123456", "76543210"]) {
      expect(erreurNumero(n), n).toBeNull();
    }
  });

  it("accepte les lignes fixes et les tranches récentes", () => {
    // 20 Bobo-Dioulasso, 25 Ouagadougou, et des préfixes mobiles ouverts après
    // la rédaction de ce code. Refuser un vrai numéro est la pire des fautes.
    for (const n of ["20123456", "25123456", "04123456", "08123456", "09123456"]) {
      expect(erreurNumero(n), n).toBeNull();
    }
  });

  it("n'invente aucune règle de préfixe", () => {
    // Tous les premiers chiffres possibles passent, dès lors que la longueur
    // est bonne : c'est le serveur qui tranchera en Phase 2.
    for (let d = 0; d <= 9; d += 1) {
      const n = `${d}1234567`;
      expect(erreurNumero(n), n).toBeNull();
    }
  });

  it("accepte un numéro saisi avec son indicatif", () => {
    expect(erreurNumero("+226 70 12 34 56")).toBeNull();
  });

  it("réclame un numéro quand rien n'est saisi", () => {
    expect(erreurNumero("")).toBe("Entrez votre numéro de téléphone.");
  });

  it("dit combien de chiffres manquent", () => {
    expect(erreurNumero("7012345")).toBe("Il manque un chiffre à ce numéro.");
    expect(erreurNumero("701234")).toBe("Il manque 2 chiffres à ce numéro.");
  });

  it("numeroValide suit erreurNumero", () => {
    expect(numeroValide("70123456")).toBe(true);
    expect(numeroValide("7012345")).toBe(false);
  });
});

describe("ressembleAMobile", () => {
  it("reconnaît les mobiles, sans jamais servir à refuser", () => {
    expect(ressembleAMobile("70123456")).toBe(true);
    expect(ressembleAMobile("06123456")).toBe(true);
    // Une ligne fixe n'est pas un mobile, mais reste un numéro valide.
    expect(ressembleAMobile("25123456")).toBe(false);
    expect(erreurNumero("25123456")).toBeNull();
  });
});

describe("erreurCode", () => {
  it("accepte six chiffres", () => {
    expect(erreurCode("123456")).toBeNull();
    expect(erreurCode("000000")).toBeNull();
    expect(codeValide("654321")).toBe(true);
  });

  it("réclame un code quand rien n'est saisi", () => {
    expect(erreurCode("")).toBe("Entrez votre code à 6 chiffres.");
  });

  it("refuse un code trop court", () => {
    expect(erreurCode("1234")).toBe("Votre code compte 6 chiffres.");
    expect(codeValide("1234")).toBe(false);
  });
});

describe("enregistrement et affichage", () => {
  it("donne une forme stable, indicatif compris", () => {
    expect(numeroCanonique("70 12 34 56")).toBe("+22670123456");
    expect(numeroCanonique("+226 70 12 34 56")).toBe("+22670123456");
  });

  it("relit cette forme de façon lisible", () => {
    expect(numeroLisible("+22670123456")).toBe("+226 70 12 34 56");
  });
});
