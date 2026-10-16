"use client";

import { Espace } from "@/components/Espace";
import { Carte, Chargement, TitreSection } from "@/components/Interface";
import { basculerRegleFinancement, listerOngs, listerReglesFinancement, trouverDistrict } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_PAIEMENT } from "@/lib/libelles";
import { LIENS_ADMIN } from "@/lib/nav";

const MOT_NIVEAU: Record<string, string> = {
  vert: "vert",
  orange: "orange",
  rouge: "rouge",
};

/**
 * Financeurs et leurs règles.
 *
 * Les ONG ne se connectent pas : elles financent, et l'équipe Siira règle ici
 * ce qu'elles prennent en charge. Une règle en veille ne propose plus de prise
 * en charge, sans être supprimée.
 */
export default function Financeurs() {
  return (
    <Espace role="admin" liens={LIENS_ADMIN} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { donnees, pret } = useDonnees(() => ({
    ongs: listerOngs(),
    regles: listerReglesFinancement(),
  }));

  if (!pret || !donnees) return <Chargement />;

  return (
    <>
      <TitreSection aide="Qui finance quoi : les budgets, et les cas que chacun couvre.">
        Financeurs
      </TitreSection>

      <div className="flex flex-col gap-4">
        {donnees.ongs.map((o) => {
          const regles = donnees.regles.filter((r) => r.ong_id === o.id);
          return (
            <Carte key={o.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-lg">{o.nom}</h2>
                <p className="chiffres-fixes text-[0.95rem] text-sable-600">
                  {o.budget_restant.toLocaleString("fr-FR")} FCFA restants sur{" "}
                  {o.budget_total.toLocaleString("fr-FR")}
                </p>
              </div>

              <div
                aria-hidden="true"
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sable-200"
              >
                <div
                  className="h-1.5 rounded-full bg-rose-500"
                  style={{
                    width: `${o.budget_total ? Math.round((o.budget_restant / o.budget_total) * 100) : 0}%`,
                  }}
                />
              </div>

              <h3 className="mt-5 mb-2 text-[1.05rem] font-medium text-prune-900">
                Ce qu&apos;elle prend en charge
              </h3>

              {regles.length === 0 ? (
                <p className="text-[0.95rem] text-sable-600">
                  Aucune règle : cette ONG ne reçoit aucune demande.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {regles.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-[var(--radius-moyen)] border border-sable-200 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.95rem] text-prune-900">
                            {r.districts
                              .map((d) => trouverDistrict(d)?.nom ?? d)
                              .join(", ")}
                          </p>
                          <p className="mt-1 text-sm text-sable-600">
                            Niveau {r.niveaux.map((n) => MOT_NIVEAU[n] ?? n).join(" ou ")} ·{" "}
                            {r.situations
                              .map((s) => LIBELLE_PAIEMENT[s].toLowerCase())
                              .join(", ")}
                          </p>
                        </div>
                        <label className="flex min-h-[var(--spacing-cible)] cursor-pointer items-center gap-2 text-[0.95rem] text-prune-800">
                          <input
                            type="checkbox"
                            checked={r.active}
                            onChange={(e) =>
                              basculerRegleFinancement(r.id, e.target.checked)
                            }
                            className="h-5 w-5 accent-rose-600"
                          />
                          {r.active ? "En service" : "En veille"}
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Carte>
          );
        })}
      </div>
    </>
  );
}
