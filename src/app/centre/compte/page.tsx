"use client";

import { Espace } from "@/components/Espace";
import { Carte, Ligne, TitreSection } from "@/components/Interface";
import { trouverCentre } from "@/lib/data";
import { LIENS_CENTRE } from "@/lib/nav";
import { LIBELLE_ROLE, useSession } from "@/lib/session";

export default function Compte() {
  return (
    <Espace role="centre" liens={LIENS_CENTRE} large>
      <Contenu />
    </Espace>
  );
}

function Contenu() {
  const { profil } = useSession();
  if (!profil) return null;

  const centre = profil.centre_id ? trouverCentre(profil.centre_id) : undefined;

  return (
    <>
      <TitreSection aide="Votre profil et le centre auquel ce compte est rattaché.">
        Compte
      </TitreSection>

      <div className="max-w-xl">
        <Carte>
          <dl>
            <Ligne libelle="Nom">{profil.nom}</Ligne>
            <Ligne libelle="Rôle">{LIBELLE_ROLE[profil.role]}</Ligne>
            <Ligne libelle="Centre de rattachement">{centre ? centre.nom : "—"}</Ligne>
            <Ligne libelle="Service">{centre?.service ?? "—"}</Ligne>
          </dl>
        </Carte>
      </div>
    </>
  );
}
