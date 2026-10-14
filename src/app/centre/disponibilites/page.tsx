"use client";

import { Espace } from "@/components/Espace";
import {
  Carte,
  Chargement,
  Ligne,
  MessageInfo,
  TitreSection,
} from "@/components/Interface";
import { lireEtat, trouverCentre } from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { dateCourte } from "@/lib/libelles";
import { LIENS_CENTRE } from "@/lib/nav";
import { useSession } from "@/lib/session";

const LIBELLE_EXAMEN: Record<string, string> = {
  echographie: "Échographie mammaire",
  mammographie: "Mammographie",
  biopsie: "Biopsie",
};

export default function Disponibilites() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  const centreId = profil?.centre_id ?? "";

  const { donnees, pret } = useDonnees(() => {
    const centre = trouverCentre(centreId);
    if (!centre) return null;
    const maintenant = Date.now();
    const finSemaine = maintenant + 7 * 86400000;
    const creneaux = lireEtat().creneaux.filter((c) => c.centre_id === centreId);
    const aVenir = creneaux
      .filter((c) => new Date(c.debut).getTime() >= maintenant)
      .sort((a, b) => a.debut.localeCompare(b.debut));
    return {
      centre,
      libresSemaine: aVenir.filter(
        (c) => c.libre && new Date(c.debut).getTime() < finSemaine,
      ).length,
      prochains: aVenir.slice(0, 12),
      totalLibres: aVenir.filter((c) => c.libre).length,
    };
  });

  if (!pret) return <Chargement />;
  if (!donnees) return <MessageInfo>Aucun centre rattaché à ce compte.</MessageInfo>;

  const { centre, libresSemaine, prochains, totalLibres } = donnees;

  return (
    <>
      <TitreSection aide="Ces informations sont utilisées pour choisir votre centre lors d'une orientation.">
        Disponibilités
      </TitreSection>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Carte>
          <h2 className="mb-3 text-lg">{centre.nom}</h2>
          <dl>
            <Ligne libelle="Service">{centre.service}</Ligne>
            <Ligne libelle="Examens proposés">
              {centre.examens.map((e) => LIBELLE_EXAMEN[e] ?? e).join(", ")}
            </Ligne>
            <Ligne libelle="Places par semaine">{centre.places_semaine}</Ligne>
            <Ligne libelle="Places libres cette semaine">{libresSemaine}</Ligne>
            <Ligne libelle="Rendez-vous libres sur 30 jours">{totalLibres}</Ligne>
          </dl>
          <p className="mt-4 text-sm text-sable-600">
            Pour modifier ces informations pendant la démonstration, contactez
            l&apos;équipe Siira.
          </p>
        </Carte>

        <Carte>
          <h2 className="mb-3 text-lg">Prochains rendez-vous</h2>
          <ul className="flex flex-col">
            {prochains.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 border-b border-sable-200 py-2.5 last:border-0"
              >
                <span className="text-[0.95rem] text-prune-800">
                  {dateCourte(c.debut)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-sm font-medium ${
                    c.libre
                      ? "border-vert-bord bg-vert-bg text-vert-texte"
                      : "border-sable-300 bg-sable-100 text-sable-700"
                  }`}
                >
                  {c.libre ? "Libre" : "Pris"}
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      </div>
    </>
  );
}
