import { describe, it, expect } from "vitest";
import {
  calculerMontant,
  ongsCorrespondantes,
  regleCorrespond,
  formaterFcfa,
  SOINS_PAR_NIVEAU,
} from "./financement";
import type { Ong, RegleFinancement, Tarif } from "./types";

const TARIFS: Tarif[] = [
  { centre_id: "c1", soin: "consultation", montant: 5000 },
  { centre_id: "c1", soin: "echographie", montant: 15000 },
  { centre_id: "c1", soin: "biopsie", montant: 35000 },
  { centre_id: "c1", soin: "transport", montant: 5000 },
];

const ongA: Ong = {
  id: "ong-a",
  nom: "ONG A",
  budget_total: 1000000,
  budget_restant: 1000000,
};
const ongB: Ong = {
  id: "ong-b",
  nom: "ONG B",
  budget_total: 500000,
  budget_restant: 500000,
};

function regle(p: Partial<RegleFinancement> & { ong_id: string }): RegleFinancement {
  return {
    id: `r-${p.ong_id}`,
    districts: ["d-saaba", "d-koubri"],
    niveaux: ["rouge"],
    situations: ["ne_peut_pas", "partielle"],
    active: true,
    ...p,
  };
}

describe("montant demande", () => {
  it("un cas rouge demande les quatre soins", () => {
    expect(SOINS_PAR_NIVEAU.rouge).toEqual([
      "consultation",
      "echographie",
      "biopsie",
      "transport",
    ]);
    const m = calculerMontant("rouge", "ne_peut_pas", "c1", TARIFS);
    expect(m?.cout_total).toBe(60000);
    expect(m?.montant).toBe(60000);
  });

  it("un cas orange n'inclut pas la biopsie", () => {
    const m = calculerMontant("orange", "ne_peut_pas", "c1", TARIFS);
    expect(m?.soins).not.toContain("biopsie");
    expect(m?.montant).toBe(25000);
  });

  it("un paiement partiel divise le montant par deux", () => {
    const m = calculerMontant("rouge", "partielle", "c1", TARIFS);
    expect(m?.montant).toBe(30000);
  });

  it("une patiente qui peut payer ne declenche aucune demande", () => {
    expect(calculerMontant("rouge", "peut_payer", "c1", TARIFS)).toBeNull();
  });

  it("un tarif absent compte pour zero sans faire tomber le calcul", () => {
    const m = calculerMontant("rouge", "ne_peut_pas", "c-inconnu", TARIFS);
    expect(m?.cout_total).toBe(0);
    expect(m?.montant).toBe(0);
  });

  it("le montant est arrondi aux 100 FCFA superieurs", () => {
    const tarifsImpairs: Tarif[] = [
      { centre_id: "c1", soin: "consultation", montant: 5050 },
      { centre_id: "c1", soin: "echographie", montant: 15000 },
      { centre_id: "c1", soin: "transport", montant: 5000 },
    ];
    const m = calculerMontant("orange", "partielle", "c1", tarifsImpairs);
    expect(m?.cout_total).toBe(25050);
    expect(m?.montant).toBe(12600);
  });
});

describe("correspondance des regles d'ONG", () => {
  const cas = {
    district_id: "d-saaba",
    niveau: "rouge" as const,
    capacite_paiement: "ne_peut_pas" as const,
    montant: 60000,
  };

  it("une regle qui couvre tout correspond", () => {
    expect(regleCorrespond(regle({ ong_id: "ong-a" }), cas, ongA)).toBe(true);
  });

  it("une regle inactive ne correspond jamais", () => {
    expect(regleCorrespond(regle({ ong_id: "ong-a", active: false }), cas, ongA)).toBe(false);
  });

  it("un district hors zone ne correspond pas", () => {
    expect(
      regleCorrespond(regle({ ong_id: "ong-a", districts: ["d-ziniare"] }), cas, ongA),
    ).toBe(false);
  });

  it("un niveau non couvert ne correspond pas", () => {
    expect(
      regleCorrespond(regle({ ong_id: "ong-a", niveaux: ["orange"] }), cas, ongA),
    ).toBe(false);
  });

  it("une situation de paiement non couverte ne correspond pas", () => {
    expect(
      regleCorrespond(regle({ ong_id: "ong-a", situations: ["partielle"] }), cas, ongA),
    ).toBe(false);
  });

  it("un budget insuffisant ecarte l'ONG", () => {
    const pauvre = { ...ongA, budget_restant: 10000 };
    expect(regleCorrespond(regle({ ong_id: "ong-a" }), cas, pauvre)).toBe(false);
  });

  it("un budget exactement egal au montant est accepte", () => {
    const juste = { ...ongA, budget_restant: 60000 };
    expect(regleCorrespond(regle({ ong_id: "ong-a" }), cas, juste)).toBe(true);
  });
});

describe("liste des ONG correspondantes", () => {
  const regles = [
    regle({ ong_id: "ong-a", districts: ["d-saaba", "d-koubri"], niveaux: ["rouge"] }),
    regle({
      ong_id: "ong-b",
      districts: ["d-saaba", "d-koubri", "d-ziniare", "d-loumbila"],
      niveaux: ["orange", "rouge"],
    }),
  ];

  it("le cas d'Awa, rouge a Saaba, interesse les deux ONG", () => {
    const r = ongsCorrespondantes(
      {
        district_id: "d-saaba",
        niveau: "rouge",
        capacite_paiement: "ne_peut_pas",
        montant: 60000,
      },
      regles,
      [ongA, ongB],
    );
    expect(r.map((o) => o.id).sort()).toEqual(["ong-a", "ong-b"]);
  });

  it("le cas d'Aminata, orange a Koubri, n'interesse que l'ONG B", () => {
    const r = ongsCorrespondantes(
      {
        district_id: "d-koubri",
        niveau: "orange",
        capacite_paiement: "partielle",
        montant: 12500,
      },
      regles,
      [ongA, ongB],
    );
    expect(r.map((o) => o.id)).toEqual(["ong-b"]);
  });

  it("aucune ONG ne correspond dans un district non couvert", () => {
    const r = ongsCorrespondantes(
      {
        district_id: "d-inconnu",
        niveau: "rouge",
        capacite_paiement: "ne_peut_pas",
        montant: 60000,
      },
      regles,
      [ongA, ongB],
    );
    expect(r).toEqual([]);
  });

  it("deux regles de la meme ONG ne la font pas apparaitre deux fois", () => {
    const doublon = [
      regle({ ong_id: "ong-a" }),
      regle({ ong_id: "ong-a", id: "r-bis" }),
    ];
    const r = ongsCorrespondantes(
      {
        district_id: "d-saaba",
        niveau: "rouge",
        capacite_paiement: "ne_peut_pas",
        montant: 60000,
      },
      doublon,
      [ongA],
    );
    expect(r).toHaveLength(1);
  });
});

describe("affichage des montants", () => {
  it("un montant est lisible avec des espaces", () => {
    expect(formaterFcfa(60000)).toBe("60 000 FCFA");
    expect(formaterFcfa(0)).toBe("0 FCFA");
  });
});
