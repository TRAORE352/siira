"use client";

/**
 * Fiche structurée affichée champ par champ, chaque champ modifiable.
 * Toute modification relance aussitôt le classement.
 */

import { Liste } from "./Champs";
import { Carte } from "./Interface";
import {
  LIBELLE_DOULEUR,
  LIBELLE_ECOULEMENT,
  LIBELLE_PEAU,
  LIBELLE_SEIN,
} from "@/lib/libelles";
import type { Douleur, Ecoulement, Fiche, Sein, SignePeau } from "@/lib/types";

const OUI_NON = [
  { valeur: "true", libelle: "Oui" },
  { valeur: "false", libelle: "Non" },
];

function versBooleen(v: string): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function depuisBooleen(v: boolean | null): string {
  return v === null ? "" : String(v);
}

const SIGNES_PEAU: SignePeau[] = ["retraction", "peau_orange", "ulceration", "rougeur"];

export function FicheModifiable({
  fiche,
  surChangement,
  champASignaler,
}: {
  fiche: Fiche;
  surChangement: (f: Fiche) => void;
  /** Champ que l'agent doit absolument compléter. */
  champASignaler?: "masse" | null;
}) {
  function set<K extends keyof Fiche>(cle: K, valeur: Fiche[K]) {
    surChangement({ ...fiche, [cle]: valeur });
  }

  function basculerPeau(signe: SignePeau, actif: boolean) {
    const liste = actif
      ? [...fiche.peau, signe]
      : fiche.peau.filter((s) => s !== signe);
    surChangement({ ...fiche, peau: liste });
  }

  return (
    <Carte>
      <h3 className="mb-1 text-lg">Ce qui a été relevé</h3>
      <p className="mb-4 text-sm text-sable-600">
        Corrigez une réponse si elle ne correspond pas à votre examen. Le niveau est
        recalculé aussitôt.
      </p>

      <div className="flex flex-col gap-4">
        <Liste
          label="Sein concerné"
          placeholder="Non précisé"
          options={(["gauche", "droit", "les_deux"] as Sein[]).map((v) => ({
            valeur: v,
            libelle: LIBELLE_SEIN[v],
          }))}
          value={fiche.sein ?? ""}
          onChange={(e) => set("sein", (e.target.value || null) as Sein | null)}
        />

        <Liste
          label="Une boule dans le sein"
          placeholder="Non précisé"
          options={OUI_NON}
          value={depuisBooleen(fiche.masse)}
          erreur={
            champASignaler === "masse" && fiche.masse === null
              ? "Cette information manque. Complétez-la après votre examen."
              : undefined
          }
          onChange={(e) => set("masse", versBooleen(e.target.value))}
        />

        {fiche.masse === true ? (
          <>
            <Liste
              label="La boule est dure"
              placeholder="Non précisé"
              options={OUI_NON}
              value={depuisBooleen(fiche.masse_dure)}
              onChange={(e) => set("masse_dure", versBooleen(e.target.value))}
            />
            <Liste
              label="La boule ne bouge pas sous les doigts"
              placeholder="Non précisé"
              options={OUI_NON}
              value={depuisBooleen(fiche.masse_fixe)}
              onChange={(e) => set("masse_fixe", versBooleen(e.target.value))}
            />
          </>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="duree"
            className="text-[0.95rem] font-medium text-prune-800"
          >
            Depuis combien de semaines
            <span className="ml-1.5 font-normal text-sable-500">(facultatif)</span>
          </label>
          <input
            id="duree"
            type="number"
            inputMode="numeric"
            min={0}
            max={520}
            value={fiche.duree_semaines ?? ""}
            onChange={(e) =>
              set(
                "duree_semaines",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="min-h-[var(--spacing-cible)] w-full rounded-[var(--radius-moyen)] border border-sable-300 bg-white px-3.5 py-3 text-base text-prune-900 focus:border-rose-600"
          />
        </div>

        <Liste
          label="Douleur"
          placeholder="Non précisé"
          options={(["aucune", "localisee", "deux_seins_cyclique"] as Douleur[]).map(
            (v) => ({ valeur: v, libelle: LIBELLE_DOULEUR[v] }),
          )}
          value={fiche.douleur ?? ""}
          onChange={(e) => set("douleur", (e.target.value || null) as Douleur | null)}
        />

        <fieldset className="border-0 p-0">
          <legend className="mb-2 text-[0.95rem] font-medium text-prune-800">
            Changements de la peau du sein
          </legend>
          <div className="flex flex-col gap-2">
            {SIGNES_PEAU.map((signe) => {
              const actif = fiche.peau.includes(signe);
              return (
                <label
                  key={signe}
                  className={`flex min-h-[var(--spacing-cible)] cursor-pointer items-center gap-3 rounded-[var(--radius-moyen)] border p-3 transition-colors ${
                    actif
                      ? "border-rose-600 bg-rose-50"
                      : "border-sable-300 bg-white hover:bg-sable-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={actif}
                    onChange={(e) => basculerPeau(signe, e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-rose-600"
                  />
                  <span className="text-[0.95rem] text-prune-900">
                    {LIBELLE_PEAU[signe]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Liste
          label="Le mamelon est rentré depuis peu"
          placeholder="Non précisé"
          options={OUI_NON}
          value={depuisBooleen(fiche.mamelon_retraction_recente)}
          onChange={(e) =>
            set("mamelon_retraction_recente", versBooleen(e.target.value))
          }
        />

        <Liste
          label="Écoulement au mamelon"
          placeholder="Non précisé"
          options={(["aucun", "sanglant", "non_sanglant"] as Ecoulement[]).map((v) => ({
            valeur: v,
            libelle: LIBELLE_ECOULEMENT[v],
          }))}
          value={fiche.ecoulement ?? ""}
          onChange={(e) =>
            set("ecoulement", (e.target.value || null) as Ecoulement | null)
          }
        />

        {fiche.ecoulement === "sanglant" || fiche.ecoulement === "non_sanglant" ? (
          <Liste
            label="L'écoulement vient d'un seul côté"
            placeholder="Non précisé"
            options={OUI_NON}
            value={depuisBooleen(fiche.ecoulement_un_cote)}
            onChange={(e) => set("ecoulement_un_cote", versBooleen(e.target.value))}
          />
        ) : null}

        <Liste
          label="Ganglion sous l'aisselle"
          placeholder="Non précisé"
          options={OUI_NON}
          value={depuisBooleen(fiche.ganglion_aisselle)}
          onChange={(e) => set("ganglion_aisselle", versBooleen(e.target.value))}
        />

        <Liste
          label="Cas de cancer du sein dans la famille"
          placeholder="Non précisé"
          options={OUI_NON}
          value={depuisBooleen(fiche.antecedents_familiaux)}
          onChange={(e) => set("antecedents_familiaux", versBooleen(e.target.value))}
        />

        {fiche.autres ? (
          <div>
            <p className="text-[0.95rem] font-medium text-prune-800">Autre information</p>
            <p className="mt-1 text-[0.95rem] text-prune-900">{fiche.autres}</p>
          </div>
        ) : null}
      </div>
    </Carte>
  );
}
