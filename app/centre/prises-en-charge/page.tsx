import PrisesEnChargeListe from "@/components/prises-en-charge-liste";
import { getContexteCentre, getDossiersCentre } from "@/lib/centre";

export default async function Page() {
  const contexte = await getContexteCentre();
  if (!contexte || !contexte.centreId) return null;

  const dossiers = await getDossiersCentre(contexte.centreId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-texte-principal">Prises en charge</h1>
        <p className="text-sm text-texte-secondaire">
          Les demandes de financement de vos dossiers, avec le coût estimé. Enregistrez l&apos;accord
          d&apos;un partenaire ou refusez la prise en charge.
        </p>
      </div>
      <PrisesEnChargeListe dossiers={dossiers} />
    </div>
  );
}
