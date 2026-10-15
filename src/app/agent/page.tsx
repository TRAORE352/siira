"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Espace } from "@/components/Espace";
import { Installation } from "@/components/Installation";
import { EtatVide, Squelette } from "@/components/Interface";
import { Marque } from "@/components/Logo";
import { listerPatientesAgent } from "@/lib/data";
import type { PatienteEnListe } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_STATUT_ORIENTATION, depuisCourt } from "@/lib/libelles";
import { fermerSession, lireNumeroSession, useSession } from "@/lib/session";
import { numeroLisible } from "@/lib/telephone";

export default function AccueilAgent() {
  return (
    <Espace role="agent" entete="aucun">
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
  const aSuivre = liste.filter((d) => d.absente).length;
  /* Dossiers partis au centre dont le résultat n'est pas encore connu. */
  const enAttente = liste.filter(
    (d) =>
      d.orientation &&
      ["envoyee", "recue", "examens"].includes(d.orientation.statut),
  ).length;

  return (
    <>
      <EnTeteAgent
        nom={profil?.nom ?? ""}
        centre={profil?.centre_sante ?? null}
        total={liste.length}
        aSuivre={aSuivre}
        enAttente={enAttente}
        pret={pret}
      />

      <main id="contenu" className="feuille relative -mt-6 flex-1 px-4 pt-6 pb-32 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl">Mes patientes</h2>
            {liste.length > 0 ? (
              /*
                « 3 suivies » ne voulait rien dire tout seul, et le texte
                d'aide était en sable-500 : 4,34 pour 1 sur la feuille, sous
                le seuil de 4,5 exigé pour le petit texte. sable-600 est le
                jeton que le système de design réserve à cet usage (6,9:1).
              */
              <span className="chiffres-fixes text-sm text-sable-600">
                {liste.length} patiente{liste.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          <div className="mt-4">
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

          <div className="mt-6">
            <Installation />
          </div>
        </div>
      </main>

      <BarreOnglets />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* En-tête : marque, salutation, synthèse du jour                       */
/* ------------------------------------------------------------------ */

function EnTeteAgent({
  nom,
  centre,
  total,
  aSuivre,
  enAttente,
  pret,
}: {
  nom: string;
  centre: string | null;
  total: number;
  aSuivre: number;
  enAttente: number;
  pret: boolean;
}) {
  const router = useRouter();
  const numero = lireNumeroSession();
  /* « Salimata Ouédraogo » → « Salimata » : on salue par le prénom. */
  const prenom = nom.split(" ")[0] ?? "";

  return (
    <header className="fond-marque px-4 pt-6 pb-12 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-white/95 p-1">
              <Marque taille={32} />
            </span>
            <span className="flex flex-col">
              <span className="text-[0.95rem] font-medium text-white">
                {centre ?? "Agent de santé"}
              </span>
              {numero ? (
                <span className="chiffres-fixes text-xs text-rose-100/70">
                  {numeroLisible(numero)}
                </span>
              ) : null}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              fermerSession();
              router.replace("/connexion");
            }}
            className="pression flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border border-white/20 bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/15"
          >
            Quitter
          </button>
        </div>

        <p className="mt-7 text-sm text-rose-100/75">{salutation()}</p>
        <h1 className="mt-0.5 font-[family-name:var(--font-titre)] text-[1.9rem] leading-tight text-white">
          {prenom || "Bienvenue"}
        </h1>

        {/* Synthèse : trois nombres, pas un tableau de bord. */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <Chiffre libelle="Patientes" valeur={total} pret={pret} />
          <Chiffre libelle="En attente" valeur={enAttente} pret={pret} />
          <Chiffre libelle="À revoir" valeur={aSuivre} pret={pret} alerte={aSuivre > 0} />
        </div>
      </div>
    </header>
  );
}

function salutation(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function Chiffre({
  libelle,
  valeur,
  pret,
  alerte = false,
}: {
  libelle: string;
  valeur: number;
  pret: boolean;
  alerte?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-moyen)] border border-white/12 bg-white/8 px-3 py-2.5">
      <p
        className={
          alerte
            ? "chiffres-fixes text-2xl font-semibold text-rose-300"
            : "chiffres-fixes text-2xl font-semibold text-white"
        }
      >
        {pret ? valeur : "—"}
      </p>
      <p className="mt-0.5 text-xs leading-tight text-rose-100/70">{libelle}</p>
    </div>
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
/* Barre d'onglets, au pouce                                            */
/* ------------------------------------------------------------------ */

/**
 * Deux actions seulement, dont celle que l'agent fait le plus : enregistrer
 * une nouvelle consultation. Elle reste à portée du pouce sur tout l'écran,
 * plutôt qu'en haut de page où il faut remonter la liste pour l'atteindre.
 */
function BarreOnglets() {
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
