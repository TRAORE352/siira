import { BoutonLien } from "@/components/Bouton";
import { Installation } from "@/components/Installation";
import { Logo } from "@/components/Logo";
import {
  ESPACE_ACTIF,
  mentionEspace,
  presentationEspace,
  titreEspace,
} from "@/lib/espaces";

/*
 * Page d'entrée d'une adresse.
 * Sur une adresse dédiée, elle ne parle que de son public : l'agent ne voit pas
 * de lien vers l'espace du centre, et réciproquement. Sur l'application
 * complète, elle reste la page de présentation du projet.
 */
export default function Accueil() {
  const mention = mentionEspace(ESPACE_ACTIF);

  return (
    <main id="contenu" className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16">
      <Logo taille="grand" lien={false} />

      {mention ? (
        <p className="mt-6 text-sm font-medium tracking-wide text-rose-700 uppercase">{mention}</p>
      ) : null}

      <h1 className="mt-3 text-4xl">{titreEspace(ESPACE_ACTIF)}</h1>
      <p className="mt-3 text-lg text-prune-700">{presentationEspace(ESPACE_ACTIF)}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <BoutonLien href="/connexion">Se connecter</BoutonLien>
        {ESPACE_ACTIF === "complet" ? (
          <BoutonLien href="/design" variante="second">
            Systeme de design
          </BoutonLien>
        ) : null}
      </div>

      {ESPACE_ACTIF === "agent" ? <Installation /> : null}
    </main>
  );
}
