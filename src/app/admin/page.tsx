"use client";

import Link from "next/link";
import { Espace } from "@/components/Espace";
import { Carte, Chargement, Ligne, TitreSection } from "@/components/Interface";
import { lireEtat, listerComptesAgents, listerProfils } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIENS_ADMIN } from "@/lib/nav";
import { LIBELLE_ROLE } from "@/lib/session";

export default function TableauDeBord() {
  return (
    <Espace role="admin" liens={LIENS_ADMIN} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { donnees, pret } = useDonnees(() => {
    const e = lireEtat();
    const centres = e.centres ?? [];
    const regles = e.regles_financement;
    return {
      patientes: e.patientes.length,
      consultations: e.consultations.length,
      orientations: e.orientations.length,
      financements: e.financements.length,
      suivis: e.suivis.length,
      centres: centres.length,
      centresInactifs: centres.filter((c) => !c.actif).length,
      creneauxLibres: e.creneaux.filter((c) => c.libre).length,
      profils: listerProfils().length,
      inscrits: listerComptesAgents().length,
      ongs: e.ongs,
      reglesEnVeille: regles.filter((r) => !r.active).length,
      budgetRestant: e.ongs.reduce((s, o) => s + o.budget_restant, 0),
    };
  });

  if (!pret || !donnees) return <Chargement />;

  const d = donnees;

  return (
    <>
      <TitreSection aide="L'état de la plateforme, et ce qui demande une décision.">
        Tableau de bord
      </TitreSection>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Carte>
          <h2 className="mb-3 text-lg">Activité</h2>
          <dl>
            <Ligne libelle="Patientes">{d.patientes}</Ligne>
            <Ligne libelle="Consultations">{d.consultations}</Ligne>
            <Ligne libelle="Orientations">{d.orientations}</Ligne>
            <Ligne libelle="Prises en charge">{d.financements}</Ligne>
            <Ligne libelle="Étapes de suivi">{d.suivis}</Ligne>
          </dl>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Comptes</h2>
          <dl>
            <Ligne libelle="Comptes enregistrés">{d.profils}</Ligne>
            <Ligne libelle="Inscrits depuis l'application">{d.inscrits}</Ligne>
          </dl>
          <Link
            href="/admin/comptes"
            className="mt-3 inline-flex min-h-[var(--spacing-cible)] items-center text-[0.95rem] font-medium text-rose-700 underline-offset-4 hover:underline"
          >
            Voir les comptes →
          </Link>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Ce qui demande une décision</h2>
          <dl>
            <Ligne libelle="Centres en sommeil">
              {d.centresInactifs} sur {d.centres}
            </Ligne>
            <Ligne libelle="Règles de financement en veille">{d.reglesEnVeille}</Ligne>
            <Ligne libelle="Budget restant des financeurs">
              {d.budgetRestant.toLocaleString("fr-FR")} FCFA
            </Ligne>
            <Ligne libelle="Rendez-vous libres">{d.creneauxLibres}</Ligne>
          </dl>
          <Link
            href="/admin/centres"
            className="mt-3 inline-flex min-h-[var(--spacing-cible)] items-center text-[0.95rem] font-medium text-rose-700 underline-offset-4 hover:underline"
          >
            Centres et tarifs →
          </Link>
        </Carte>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start">
        <Carte>
          <h2 className="mb-3 text-lg">Financeurs</h2>
          <dl>
            {d.ongs.map((o) => (
              <Ligne key={o.id} libelle={o.nom}>
                {o.budget_restant.toLocaleString("fr-FR")} sur{" "}
                {o.budget_total.toLocaleString("fr-FR")} FCFA
              </Ligne>
            ))}
          </dl>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Les rôles de la plateforme</h2>
          <dl>
            {(["agent", "centre", "admin"] as const).map((r) => (
              <Ligne key={r} libelle={LIBELLE_ROLE[r]}>
                {listerProfils(r).length} compte{listerProfils(r).length > 1 ? "s" : ""}
              </Ligne>
            ))}
          </dl>
        </Carte>
      </div>
    </>
  );
}
