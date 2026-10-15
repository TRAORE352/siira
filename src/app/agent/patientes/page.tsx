"use client";

import Link from "next/link";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Espace, Retour } from "@/components/Espace";
import { EtatVide, Squelette } from "@/components/Interface";
import { listerPatientesAgent } from "@/lib/data";
import type { PatienteEnListe } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_ORIENTATION, depuisCourt } from "@/lib/libelles";
import { useSession } from "@/lib/session";

/**
 * Liste des patientes de l'agent.
 *
 * Elle vivait sur l'accueil ; l'accueil est devenu un écran de choix, et la
 * liste a donc sa propre adresse. C'est l'écran que l'agent ouvre le plus :
 * l'action principale y reste fixée en bas, à portée du pouce.
 */
export default function PatientesAgent() {
  return (
    <Espace role="agent">
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const agentId = profil?.id ?? "";
  const { donnees, pret } = useDonnees<PatienteEnListe[]>(() =>
    agentId ? listerPatientesAgent(agentId) : [],
  );

  const liste = donnees ?? [];

  return (
    <>
      <Retour href="/agent" libelle="Accueil" />

      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl">Mes patientes</h1>
        {liste.length > 0 ? (
          <span className="chiffres-fixes text-sm text-sable-600">
            {liste.length} patiente{liste.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {/* La réserve de 112 px laisse la dernière carte au-dessus de la barre. */}
      <div className="mt-4 pb-28">
        {!pret ? (
          <Squelette lignes={3} />
        ) : liste.length === 0 ? (
          <EtatVide
            titre="Aucune patiente pour le moment"
            texte="Dès que vous enregistrez une première consultation, elle apparaît ici."
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {liste.map((d) => (
              <li key={d.patiente.id}>
                <LignePatiente detail={d} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <BarreNouvelle />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ligne d'une patiente                                                 */
/* ------------------------------------------------------------------ */

function LignePatiente({ detail }: { detail: PatienteEnListe }) {
  const { patiente, consultation, orientation, absente, dernier_mouvement } = detail;
  const niveau = consultation?.niveau_valide ?? consultation?.niveau_propose ?? null;

  const statut = orientation
    ? LIBELLE_STATUT_ORIENTATION[orientation.statut]
    : consultation?.statut === "close"
      ? "Surveillance à domicile"
      : "Consultation en cours";

  return (
    <Link
      href={`/agent/patiente/${patiente.id}`}
      className="pression block rounded-[var(--radius-grand)] border border-sable-200 bg-white p-4 shadow-[var(--shadow-carte)] hover:border-sable-300 hover:bg-sable-50"
    >
      <div className="flex items-start gap-3">
        <Initiales nom={patiente.nom} niveau={niveau} />

        <div className="min-w-0 flex-1">
          {/*
            Le nom tient une ligne à lui seul. À 360 px, la colonne de texte
            fait 238 px : partagée avec l'étiquette de niveau, elle coupait le
            nom (« Korotimi Zoun… »). L'agent doit pouvoir lire le nom de sa
            patiente, et un nom de trois mots passe donc sur deux lignes
            plutôt que d'être raccourci.
          */}
          <p className="line-clamp-2 text-[1.05rem] font-medium text-prune-900">{patiente.nom}</p>

          {/* Les faits de la fiche, et le niveau d'urgence à leur droite. */}
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm text-sable-600">
              <span className="chiffres-fixes">{patiente.age}</span> ans ·{" "}
              {detail.district?.nom ?? "District non précisé"}
            </p>
            {niveau ? <BadgeNiveau niveau={niveau} className="shrink-0" /> : null}
          </div>

          {/*
            État du dossier, et depuis quand il en est là. La date affichée est
            celle du dernier mouvement du dossier, pas celle de l'inscription :
            une date plus vieille que l'état qu'elle accompagne se lirait de
            travers (« Résultat disponible il y a trois semaines »).
          */}
          <div className="mt-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-prune-700">{statut}</span>
            <span className="chiffres-fixes shrink-0 text-sable-600">
              {depuisCourt(dernier_mouvement)}
            </span>
          </div>
        </div>
      </div>

      {absente ? (
        <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-petit)] border border-rouge-bord bg-rouge-bg px-3 py-2 text-sm font-medium text-rouge-texte">
          <span aria-hidden="true">!</span>
          Elle n&apos;est pas venue au rendez-vous. Allez la voir.
        </p>
      ) : null}
    </Link>
  );
}

/**
 * Pastille d'initiales, teintée par le niveau d'urgence.
 * Elle donne un point d'accroche à l'œil dans une liste, sans photo ni icône.
 */
function Initiales({ nom, niveau }: { nom: string; niveau: string | null }) {
  const lettres = nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

  const teinte =
    niveau === "rouge"
      ? "border-rouge-bord bg-rouge-bg text-rouge-texte"
      : niveau === "orange"
        ? "border-orange-bord bg-orange-bg text-orange-texte"
        : niveau === "vert"
          ? "border-vert-bord bg-vert-bg text-vert-texte"
          : "border-sable-200 bg-sable-100 text-prune-700";

  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${teinte}`}
    >
      {lettres}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Action principale, fixée en bas                                      */
/* ------------------------------------------------------------------ */

/**
 * La barre garde l'action que l'agent fait le plus — enregistrer une nouvelle
 * consultation — à portée du pouce sur toute la hauteur de la liste, plutôt
 * qu'en haut de page où il faut remonter pour l'atteindre.
 */
function BarreNouvelle() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sable-200 bg-white/92 pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-onglets)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/agent/consultation/nouvelle"
          className="pression flex min-h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-[var(--radius-moyen)] bg-rose-600 px-4 text-base font-medium text-white shadow-[var(--shadow-action)] hover:bg-rose-700"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            +
          </span>
          Nouvelle consultation
        </Link>
      </div>
    </div>
  );
}
