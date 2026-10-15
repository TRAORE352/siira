import ListePatientes from "@/components/liste-patientes";
import { getContexteCentre, getDossiersCentre } from "@/lib/centre";

export default async function Page() {
  const contexte = await getContexteCentre();
  if (!contexte || !contexte.centreId) return null;

  const dossiers = await getDossiersCentre(contexte.centreId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-texte-principal">Patientes</h1>
        <p className="text-sm text-texte-secondaire">
          Les cas reçus, les cas rouges en premier.
        </p>
      </div>
      <ListePatientes dossiers={dossiers} />
    </div>
  );
}
