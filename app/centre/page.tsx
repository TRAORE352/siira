import Link from "next/link";
import NouveauxDossiers, { type NouveauDossier } from "@/components/nouveaux-dossiers";
import { getContexteCentre, getDossiersCentre, calculerIndicateurs } from "@/lib/centre";

export default async function Page() {
  const contexte = await getContexteCentre();
  if (!contexte || !contexte.centreId) return null;

  const dossiers = await getDossiersCentre(contexte.centreId);
  const indicateurs = calculerIndicateurs(dossiers, new Date());

  const recus: NouveauDossier[] = dossiers
    .filter((d) => d.statut === "envoyee")
    .map((d) => ({
      id: d.orientationId,
      nom: d.patiente.nom,
      age: d.patiente.age,
      code: d.patiente.code,
      niveau: d.niveauValide,
      rendezVous: d.rendezVous,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-texte-principal">Tableau de bord</h1>
        <p className="text-sm text-texte-secondaire">
          Vue d&apos;ensemble de l&apos;activité de votre centre.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CarteIndicateur
          titre="Rendez-vous de la semaine"
          valeur={indicateurs.rdvSemaine}
          href="/centre/patientes"
        />
        <CarteIndicateur
          titre="Cas rouges en attente"
          valeur={indicateurs.casRougesAttente}
          href="/centre/patientes"
          accent
        />
        <CarteIndicateur
          titre="Prises en charge à demander"
          valeur={indicateurs.prisesEnChargeADemander}
          href="/centre/prises-en-charge"
        />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-texte-principal">
          Nouveaux dossiers reçus en direct
        </h2>
        <NouveauxDossiers centreId={contexte.centreId} initiaux={recus} />
      </section>
    </div>
  );
}

function CarteIndicateur({
  titre,
  valeur,
  href,
  accent = false,
}: {
  titre: string;
  valeur: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-carte border p-5 transition-colors ${
        accent
          ? "border-rose-principal bg-rose-clair"
          : "border-rose-bordure bg-white hover:border-rose-principal"
      }`}
    >
      <p className="text-sm text-texte-secondaire">{titre}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ? "text-rose-fonce" : "text-texte-principal"}`}>
        {valeur}
      </p>
    </Link>
  );
}
