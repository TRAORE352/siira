"use client";

import { Bouton } from "@/components/Bouton";
import { Espace } from "@/components/Espace";
import {
  Carte,
  Chargement,
  MessageInfo,
  TitreSection,
} from "@/components/Interface";
import { calculerImpact, trouverOng } from "@/lib/data";
import { formaterFcfa } from "@/lib/financement";
import { useDonnees } from "@/lib/hooks";
import { LIENS_ONG } from "@/lib/nav";
import { useSession } from "@/lib/session";

export default function ImpactOng() {
  return (
    <Espace role="ong" liens={LIENS_ONG} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const ongId = profil?.ong_id ?? "";

  const { donnees, pret } = useDonnees(() => {
    if (!ongId) return null;
    return { impact: calculerImpact(ongId), ong: trouverOng(ongId) };
  });

  if (!pret) return <Chargement />;
  if (!donnees?.ong) return <MessageInfo>Aucune ONG rattachée à ce compte.</MessageInfo>;

  const i = donnees.impact;
  const partUtilisee =
    i.budget_total > 0 ? Math.round((i.budget_utilise / i.budget_total) * 100) : 0;

  return (
    <>
      <TitreSection aide="Tous ces chiffres sont calculés à partir des cas que vous avez financés.">
        Impact de {donnees.ong.nom}
      </TitreSection>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Chiffre libelle="Budget utilisé" valeur={formaterFcfa(i.budget_utilise)} />
        <Chiffre libelle="Budget restant" valeur={formaterFcfa(i.budget_restant)} />
        <Chiffre libelle="Part du budget engagée" valeur={`${partUtilisee} %`} />
        <Chiffre libelle="Femmes financées" valeur={String(i.femmes_financees)} />
        <Chiffre libelle="Femmes venues au centre" valeur={String(i.femmes_venues)} />
        <Chiffre libelle="Résultats connus" valeur={String(i.resultats_connus)} />
        <Chiffre
          libelle="Délai moyen consultation → rendez-vous"
          valeur={
            i.delai_moyen_jours === null
              ? "Pas encore de donnée"
              : `${i.delai_moyen_jours} jours`
          }
        />
      </div>

      <Carte className="mt-4">
        <h2 className="mb-3 text-lg">Répartition par district</h2>
        {i.par_district.length === 0 ? (
          <MessageInfo>Aucun cas financé pour le moment.</MessageInfo>
        ) : (
          <ul className="flex flex-col gap-3">
            {i.par_district.map((d) => {
              const part =
                i.femmes_financees > 0
                  ? Math.round((d.nombre / i.femmes_financees) * 100)
                  : 0;
              return (
                <li key={d.district}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="text-[0.95rem] text-prune-900">{d.district}</span>
                    <span className="text-sm text-sable-600">
                      {d.nombre} {d.nombre > 1 ? "femmes" : "femme"}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-sable-200"
                    role="img"
                    aria-label={`${d.district} : ${part} pour cent des cas financés`}
                  >
                    <div
                      className="h-full rounded-full bg-rose-600"
                      style={{ width: `${Math.max(part, 3)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Carte>

      <div className="mt-4">
        <Bouton variante="second" disabled title="Bientôt disponible">
          Télécharger le rapport
        </Bouton>
        <p className="mt-1 text-sm text-sable-600">Bientôt disponible.</p>
      </div>
    </>
  );
}

function Chiffre({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <Carte>
      <p className="text-sm text-sable-600">{libelle}</p>
      <p className="mt-1 font-[family-name:var(--font-titre)] text-2xl text-prune-900">
        {valeur}
      </p>
    </Carte>
  );
}
