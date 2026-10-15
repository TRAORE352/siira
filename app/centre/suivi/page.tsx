import Link from "next/link";
import NiveauBadge from "@/components/niveau-badge";
import SuiviForm from "@/components/suivi-form";
import { getContexteCentre, getDossiersCentre } from "@/lib/centre";
import { LIBELLE_STATUT_ORIENTATION } from "@/lib/libelles";

const ORDRE_NIVEAU: Record<string, number> = { rouge: 0, orange: 1, vert: 2 };
const STATUTS_A_SUIVRE = ["envoyee", "recue", "examens", "resultat"];

export default async function Page() {
  const contexte = await getContexteCentre();
  if (!contexte || !contexte.centreId) return null;

  const dossiers = await getDossiersCentre(contexte.centreId);
  const aSuivre = dossiers
    .filter((d) => STATUTS_A_SUIVRE.includes(d.statut))
    .sort((a, b) => {
      const na = ORDRE_NIVEAU[a.niveauValide ?? ""] ?? 3;
      const nb = ORDRE_NIVEAU[b.niveauValide ?? ""] ?? 3;
      if (na !== nb) return na - nb;
      const ta = a.rendezVous ? new Date(a.rendezVous).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.rendezVous ? new Date(b.rendezVous).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-texte-principal">Suivi des soins</h1>
        <p className="text-sm text-texte-secondaire">
          Marquez la patiente reçue ou absente, enregistrez les examens, saisissez le résultat et
          laissez une note pour l&apos;agent.
        </p>
      </div>

      {aSuivre.length === 0 ? (
        <p className="rounded-carte border border-rose-bordure bg-white px-5 py-6 text-sm text-texte-secondaire">
          Aucun dossier en cours de suivi.
        </p>
      ) : (
        aSuivre.map((d) => (
          <div key={d.orientationId} className="rounded-carte border border-rose-bordure bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-texte-principal">{d.patiente.nom}</span>
                  <NiveauBadge niveau={d.niveauValide} />
                </div>
                <p className="text-sm text-texte-secondaire">
                  {d.patiente.age} ans · {d.patiente.district} ·{" "}
                  {LIBELLE_STATUT_ORIENTATION[d.statut] ?? d.statut}
                  {d.rendezVous ? ` · RDV ${formatDate(d.rendezVous)}` : ""}
                </p>
              </div>
              <Link
                href={`/centre/patientes/${d.orientationId}`}
                className="shrink-0 text-sm text-rose-fonce hover:underline"
              >
                Voir le dossier
              </Link>
            </div>
            <SuiviForm dossier={d} />
          </div>
        ))
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
