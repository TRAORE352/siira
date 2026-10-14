import { BoutonLien } from "@/components/Bouton";
import { Logo } from "@/components/Logo";

export default function Accueil() {
  return (
    <main id="contenu" className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16">
      <Logo taille="grand" lien={false} />
      <h1 className="mt-8 text-4xl">Le chemin vers les soins</h1>
      <p className="mt-3 text-lg text-prune-700">
        Siira accompagne une femme du premier doute jusqu&apos;a sa prise en charge par un
        specialiste.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <BoutonLien href="/connexion">Se connecter</BoutonLien>
        <BoutonLien href="/design" variante="second">Systeme de design</BoutonLien>
      </div>
    </main>
  );
}
