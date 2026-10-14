"use client";

import { useMemo, useState } from "react";
import { BadgeNiveau } from "@/components/BadgeNiveau";
import { Bouton } from "@/components/Bouton";
import { ZoneTexte } from "@/components/Champs";
import { Espace } from "@/components/Espace";
import {
  Carte,
  EtatVide,
  Ligne,
  MessageErreur,
  MessageSucces,
  Squelette,
  TitreSection,
} from "@/components/Interface";
import {
  calculerImpact,
  confirmerFinancement,
  listerCasOng,
  refuserFinancement,
  trouverOng,
} from "@/lib/data";
import type { CasAnonyme } from "@/lib/data";
import { formaterFcfa } from "@/lib/financement";
import { useDonnees } from "@/lib/hooks";
import { LIBELLE_PAIEMENT, dateCourte } from "@/lib/libelles";
import { LIENS_ONG } from "@/lib/nav";
import { useNouveautes } from "@/lib/nouveautes";
import { useSession } from "@/lib/session";

export default function DemandesOng() {
  return (
    <Espace role="ong" liens={LIENS_ONG} large>
      <Contenu />
    </Espace>
  );
}

type Onglet = "en_attente" | "finances" | "autres";

function Contenu() {
  const { profil } = useSession();
  const ongId = profil?.ong_id ?? "";
  const [onglet, setOnglet] = useState<Onglet>("en_attente");
  const [aConfirmer, setAConfirmer] = useState<CasAnonyme | null>(null);
  const [aRefuser, setARefuser] = useState<CasAnonyme | null>(null);
  const [raison, setRaison] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const { donnees, pret } = useDonnees(() => {
    if (!ongId) return null;
    return {
      cas: listerCasOng(ongId),
      ong: trouverOng(ongId),
      impact: calculerImpact(ongId),
    };
  });

  const cas = useMemo(() => donnees?.cas ?? [], [donnees]);
  const enAttente = cas.filter((c) => c.statut_financement === "proposee");
  const finances = cas.filter((c) => c.statut_financement === "confirmee");
  const autres = cas.filter(
    (c) => c.statut_financement === "refusee" || c.statut_financement === "retiree",
  );

  const nouveaux = useNouveautes(enAttente.map((c) => c.financement_id));

  const visibles =
    onglet === "en_attente" ? enAttente : onglet === "finances" ? finances : autres;

  function financer(c: CasAnonyme) {
    setErreur(null);
    setSucces(null);
    try {
      confirmerFinancement(c.financement_id);
      setSucces(`Le cas ${c.code} est financé : ${formaterFcfa(c.montant)}.`);
      setAConfirmer(null);
    } catch (e) {
      setAConfirmer(null);
      setErreur(
        e instanceof Error ? e.message : "Le financement n'a pas abouti. Recommencez.",
      );
    }
  }

  function refuser(c: CasAnonyme) {
    setErreur(null);
    setSucces(null);
    try {
      refuserFinancement(c.financement_id, raison.trim() || null);
      setSucces(`Le cas ${c.code} a été refusé. Il reste visible pour les autres ONG.`);
      setARefuser(null);
      setRaison("");
    } catch {
      setARefuser(null);
      setErreur("Le refus n'a pas abouti. Recommencez.");
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <TitreSection aide="Les cas qui correspondent à vos règles. Aucune information d'identité n'est transmise.">
          Demandes de financement
        </TitreSection>
        {donnees?.ong ? (
          <Carte className="min-w-56 py-3">
            <p className="text-sm text-sable-600">Budget restant</p>
            <p className="font-[family-name:var(--font-titre)] text-2xl text-prune-900">
              {formaterFcfa(donnees.ong.budget_restant)}
            </p>
            <p className="mt-1 text-sm text-sable-600">
              sur {formaterFcfa(donnees.ong.budget_total)}
            </p>
          </Carte>
        ) : null}
      </div>

      {erreur ? <MessageErreur texte={erreur} className="mb-4" /> : null}
      {succes ? (
        <div className="mb-4">
          <MessageSucces>{succes}</MessageSucces>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer">
        <Onglette
          actif={onglet === "en_attente"}
          onClick={() => setOnglet("en_attente")}
        >
          En attente ({enAttente.length})
        </Onglette>
        <Onglette actif={onglet === "finances"} onClick={() => setOnglet("finances")}>
          Financés ({finances.length})
        </Onglette>
        <Onglette actif={onglet === "autres"} onClick={() => setOnglet("autres")}>
          Refusés et retirés ({autres.length})
        </Onglette>
      </div>

      {!pret ? (
        <Squelette lignes={3} />
      ) : visibles.length === 0 ? (
        <EtatVide
          titre="Aucune demande ici"
          texte="Dès qu'un cas correspond à vos règles, il apparaît dans cette liste."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visibles.map((c) => (
            <li key={c.financement_id}>
              <Carte
                className={nouveaux.has(c.financement_id) ? "signal-nouveau" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-prune-900">{c.code}</p>
                    <p className="text-sm text-sable-600">
                      {c.age} ans · {c.district}
                    </p>
                  </div>
                  <BadgeNiveau niveau={c.niveau} />
                </div>

                <dl className="mt-3">
                  <Ligne libelle="Centre">{c.centre}</Ligne>
                  <Ligne libelle="Soins demandés">{c.soins.join(", ")}</Ligne>
                  <Ligne libelle="Situation">
                    {LIBELLE_PAIEMENT[c.capacite_paiement]}
                  </Ligne>
                  {c.rendez_vous ? (
                    <Ligne libelle="Rendez-vous">{dateCourte(c.rendez_vous)}</Ligne>
                  ) : null}
                  <Ligne libelle="Montant">{formaterFcfa(c.montant)}</Ligne>
                </dl>

                {c.statut_financement === "proposee" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Bouton onClick={() => setAConfirmer(c)}>Je finance</Bouton>
                    <Bouton variante="second" onClick={() => setARefuser(c)}>
                      Refuser
                    </Bouton>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-sable-600">
                    {c.statut_financement === "confirmee"
                      ? "Financé par votre ONG."
                      : c.statut_financement === "refusee"
                        ? "Refusé par votre ONG."
                        : "Financé par une autre ONG."}
                  </p>
                )}
              </Carte>
            </li>
          ))}
        </ul>
      )}

      {/* Confirmation du montant avant engagement */}
      {aConfirmer ? (
        <Boite
          titre="Confirmer le financement"
          surFermeture={() => setAConfirmer(null)}
        >
          <p className="text-[0.95rem] text-prune-800">
            Vous engagez {formaterFcfa(aConfirmer.montant)} pour le cas{" "}
            {aConfirmer.code} ({aConfirmer.age} ans, {aConfirmer.district}).
          </p>
          <p className="mt-2 text-sm text-sable-600">
            L&apos;argent est versé au centre de soins, jamais à la patiente.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Bouton onClick={() => financer(aConfirmer)}>Confirmer</Bouton>
            <Bouton variante="second" onClick={() => setAConfirmer(null)}>
              Annuler
            </Bouton>
          </div>
        </Boite>
      ) : null}

      {aRefuser ? (
        <Boite titre="Refuser ce cas" surFermeture={() => setARefuser(null)}>
          <p className="text-[0.95rem] text-prune-800">
            Le cas {aRefuser.code} disparaîtra de votre liste. Les autres ONG
            pourront toujours le financer.
          </p>
          <div className="mt-4">
            <ZoneTexte
              label="Raison"
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Bouton variante="danger" onClick={() => refuser(aRefuser)}>
              Refuser
            </Bouton>
            <Bouton variante="second" onClick={() => setARefuser(null)}>
              Annuler
            </Bouton>
          </div>
        </Boite>
      ) : null}
    </>
  );
}

function Onglette({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`flex min-h-[var(--spacing-cible)] items-center rounded-[var(--radius-moyen)] border px-3 text-[0.95rem] transition-colors ${
        actif
          ? "border-rose-600 bg-rose-50 font-medium text-rose-700"
          : "border-sable-300 bg-white text-prune-800 hover:bg-sable-100"
      }`}
    >
      {children}
    </button>
  );
}

/** Fenêtre de confirmation simple, fermable au clavier. */
function Boite({
  titre,
  children,
  surFermeture,
}: {
  titre: string;
  children: React.ReactNode;
  surFermeture: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-prune-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      onKeyDown={(e) => e.key === "Escape" && surFermeture()}
    >
      <div className="w-full max-w-md rounded-[var(--radius-grand)] bg-white p-5 shadow-[var(--shadow-releve)]">
        <h2 className="mb-3 text-xl">{titre}</h2>
        {children}
      </div>
    </div>
  );
}
