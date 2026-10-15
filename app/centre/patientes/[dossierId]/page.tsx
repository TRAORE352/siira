import Link from "next/link";
import { notFound } from "next/navigation";
import NiveauBadge from "@/components/niveau-badge";
import { getContexteCentre, getDossierCentre } from "@/lib/centre";
import type { FicheStructuree } from "@/lib/types";
import {
  formatFCFA,
  LIBELLE_STATUT_ORIENTATION,
  LIBELLE_STATUT_FINANCEMENT,
  LIBELLE_ETAPE,
  LIBELLE_RESULTAT,
} from "@/lib/libelles";

const SEIN = { gauche: "Gauche", droit: "Droit", les_deux: "Les deux" };
const DOULEUR = {
  aucune: "Aucune",
  localisee: "Localisée",
  deux_seins_cyclique: "Des deux seins (cyclique)",
};
const PEAU = {
  retraction: "Rétraction",
  peau_orange: "Peau d'orange",
  ulceration: "Ulcération",
  rougeur: "Rougeur étendue",
};
const ECOULEMENT = { aucun: "Aucun", sanglant: "Sanglant", non_sanglant: "Non sanglant" };

function ouiNon(v: boolean): string {
  return v ? "Oui" : "Non";
}

function ficheVersLignes(fiche: FicheStructuree): { label: string; valeur: string }[] {
  const lignes: { label: string; valeur: string }[] = [];
  if (fiche.sein) lignes.push({ label: "Sein concerné", valeur: SEIN[fiche.sein] ?? fiche.sein });
  if (fiche.masse !== null) lignes.push({ label: "Masse", valeur: ouiNon(fiche.masse) });
  if (fiche.masse_dure !== null) lignes.push({ label: "Masse dure", valeur: ouiNon(fiche.masse_dure) });
  if (fiche.masse_fixe !== null) lignes.push({ label: "Masse fixe", valeur: ouiNon(fiche.masse_fixe) });
  if (fiche.duree_semaines !== null)
    lignes.push({
      label: "Durée",
      valeur: `${fiche.duree_semaines} semaine${fiche.duree_semaines > 1 ? "s" : ""}`,
    });
  if (fiche.douleur) lignes.push({ label: "Douleur", valeur: DOULEUR[fiche.douleur] ?? fiche.douleur });
  if (fiche.peau.length > 0)
    lignes.push({ label: "Signes cutanés", valeur: fiche.peau.map((p) => PEAU[p] ?? p).join(", ") });
  if (fiche.mamelon_retraction_recente !== null)
    lignes.push({
      label: "Rétraction récente du mamelon",
      valeur: ouiNon(fiche.mamelon_retraction_recente),
    });
  if (fiche.ecoulement)
    lignes.push({ label: "Écoulement", valeur: ECOULEMENT[fiche.ecoulement] ?? fiche.ecoulement });
  if (fiche.ecoulement_un_cote !== null)
    lignes.push({ label: "Écoulement d'un seul côté", valeur: ouiNon(fiche.ecoulement_un_cote) });
  if (fiche.ganglion_aisselle !== null)
    lignes.push({ label: "Ganglion à l'aisselle", valeur: ouiNon(fiche.ganglion_aisselle) });
  if (fiche.antecedents_familiaux !== null)
    lignes.push({ label: "Antécédents familiaux", valeur: ouiNon(fiche.antecedents_familiaux) });
  if (fiche.autres) lignes.push({ label: "Autres", valeur: fiche.autres });
  return lignes;
}

export default async function Page(props: PageProps<"/centre/patientes/[dossierId]">) {
  const { dossierId } = await props.params;
  const contexte = await getContexteCentre();
  if (!contexte || !contexte.centreId) return null;

  const dossier = await getDossierCentre(contexte.centreId, dossierId);
  if (!dossier) notFound();

  const lignesFiche = ficheVersLignes(dossier.fiche ?? ({} as FicheStructuree));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/centre/patientes" className="text-sm text-rose-fonce hover:underline">
            ← Retour aux patientes
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-texte-principal">
            {dossier.patiente.nom}
          </h1>
          <p className="text-sm text-texte-secondaire">
            {dossier.patiente.age} ans · {dossier.patiente.district}
            {dossier.patiente.village ? ` · ${dossier.patiente.village}` : ""} · {dossier.patiente.code}
          </p>
        </div>
        <div className="text-right">
          <NiveauBadge niveau={dossier.niveauValide} />
          <p className="mt-1 text-sm text-texte-secondaire">
            {LIBELLE_STATUT_ORIENTATION[dossier.statut] ?? dossier.statut}
          </p>
          {dossier.rendezVous && (
            <p className="text-xs text-texte-secondaire">
              RDV {new Date(dossier.rendezVous).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href="/centre/suivi"
          className="rounded-bouton bg-rose-principal px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-fonce"
        >
          Suivi des soins →
        </Link>
      </div>

      <Section titre="Résumé pour le spécialiste">
        <p className="text-sm leading-relaxed text-texte-principal">
          {dossier.resumeIa ?? "Résumé non disponible."}
        </p>
      </Section>

      <Section titre="Fiche structurée">
        {lignesFiche.length === 0 ? (
          <p className="text-sm text-texte-secondaire">Aucune information structurée.</p>
        ) : (
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {lignesFiche.map((l) => (
              <div key={l.label} className="flex justify-between gap-4 border-b border-rose-bordure py-2">
                <dt className="text-sm text-texte-secondaire">{l.label}</dt>
                <dd className="text-sm font-medium text-texte-principal">{l.valeur}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      <Section titre="Récit original">
        <p className="text-sm italic leading-relaxed text-texte-principal">{dossier.recit}</p>
      </Section>

      <Section titre="Classement">
        <div className="space-y-2 text-sm">
          <p>
            Niveau proposé : <NiveauBadge niveau={dossier.niveauPropose} />
            {dossier.reglesDeclenchees.length > 0 && (
              <span className="ml-2 text-texte-secondaire">
                règles {dossier.reglesDeclenchees.join(", ")}
              </span>
            )}
          </p>
          <p>
            Niveau validé : <NiveauBadge niveau={dossier.niveauValide} />
          </p>
          {dossier.raisonCorrection && (
            <p className="text-texte-secondaire">
              Correction par l&apos;agent : {dossier.raisonCorrection}
              {dossier.commentaireCorrection ? ` — ${dossier.commentaireCorrection}` : ""}
            </p>
          )}
          {dossier.explication && (
            <p className="text-texte-secondaire">{dossier.explication}</p>
          )}
        </div>
      </Section>

      <Section titre="Origine">
        <p className="text-sm text-texte-principal">
          Agent : {dossier.agentNom ?? "—"}
          {dossier.agentCentreSante ? ` · ${dossier.agentCentreSante}` : ""}
        </p>
      </Section>

      <Section titre="Financement">
        {dossier.financements.length === 0 ? (
          <p className="text-sm text-texte-secondaire">Aucune demande de financement.</p>
        ) : (
          <ul className="space-y-2">
            {dossier.financements.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-texte-principal">{f.ongNom}</span>
                <span className="text-texte-secondaire">
                  {formatFCFA(f.montant)} · {LIBELLE_STATUT_FINANCEMENT[f.statut] ?? f.statut}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section titre="Suivi des soins">
        {dossier.suivis.length === 0 ? (
          <p className="text-sm text-texte-secondaire">Aucun suivi enregistré pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-3">
            {dossier.suivis.map((s) => (
              <li key={s.id} className="border-l-2 border-rose-bordure pl-4">
                <p className="text-sm font-medium text-texte-principal">
                  {LIBELLE_ETAPE[s.etape] ?? s.etape} · {LIBELLE_RESULTAT[s.resultat] ?? s.resultat}
                </p>
                {s.note && <p className="text-sm text-texte-secondaire">{s.note}</p>}
                <p className="text-xs text-texte-secondaire">
                  {new Date(s.creeLe).toLocaleString("fr-FR")}
                  {s.auteurNom ? ` · ${s.auteurNom}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-xs text-texte-secondaire">
        Cet outil ne pose pas de diagnostic. Il évalue un niveau d&apos;urgence. Seuls les examens
        médicaux (biopsie notamment) confirment un cancer.
      </p>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-carte border border-rose-bordure bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-rose-fonce">{titre}</h2>
      {children}
    </section>
  );
}
