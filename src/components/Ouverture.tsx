import Image from "next/image";

/**
 * Écran d'ouverture.
 *
 * Il couvre le temps réel de démarrage de l'application — polices, feuille de
 * style, premier rendu — plutôt que de laisser l'agent devant un écran blanc.
 *
 * Trois règles tenues :
 *
 * - **Il est dans le HTML servi.** Un rideau monté après hydratation arrive
 *   trop tard : il masquerait une application déjà chargée. C'est pour cela
 *   que ce composant est rendu par le serveur, sans état et sans effet.
 * - **Il se retire tout seul, en CSS.** L'animation `ouverture-retrait` le
 *   fait disparaître sans attendre React : si le javascript est lent, en
 *   échec, ou désactivé, l'agent n'est jamais enfermé derrière le rideau.
 * - **Il ne s'affiche qu'une fois par session**, et pas du tout si la personne
 *   a demandé moins d'animations. Cette décision est prise avant le premier
 *   rendu par le script d'{@link ScriptOuverture}, qui pose l'attribut
 *   `data-ouverture="non"` sur `<html>` ; le CSS fait le reste.
 */

/** Clé de session. Versionnée : changer l'écran rejoue l'ouverture une fois. */
const CLE = "siira.ouverture.v1";

/*
 * Script posé dans le <head>, exécuté avant le premier affichage.
 *
 * Il ne touche pas au DOM de la page, seulement à un attribut de <html> que la
 * feuille de style lit — c'est ce qui évite le scintillement : le navigateur
 * connaît la réponse avant de peindre, il n'affiche donc jamais un rideau
 * qu'il faudrait retirer juste après.
 *
 * Enveloppé dans un try : en navigation privée stricte, lire `sessionStorage`
 * peut lever. Dans ce cas l'ouverture s'affiche — jamais une page blanche.
 */
const SCRIPT = `try{var c="${CLE}",s=window.sessionStorage,v=s.getItem(c)==="1",r=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(v||r)document.documentElement.setAttribute("data-ouverture","non");s.setItem(c,"1")}catch(e){}`;

/**
 * À placer dans le `<head>`. Décide, avant la première peinture, si le rideau
 * doit s'afficher pour cette visite.
 */
export function ScriptOuverture() {
  return (
    <script
      /* Volontairement bloquant et inline : il doit précéder la peinture. */
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}

export function Ouverture() {
  return (
    <div
      /*
       * `aria-hidden` : l'écran d'ouverture est purement visuel. Un lecteur
       * d'écran doit lire la page, pas ce rideau. `pointer-events-none` le
       * rend transparent aux clics du début à la fin : il ne retient donc
       * jamais une action, même si son animation est contrariée.
       */
      aria-hidden="true"
      className="ecran-ouverture fond-marque pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center"
    >
      {/* Halo qui s'ouvre derrière la marque. */}
      <span className="splash-halo absolute h-72 w-72 rounded-full bg-rose-500/40 blur-3xl" />

      <div className="splash-marque relative flex flex-col items-center">
        <Image
          src="/brand/icon-512.png"
          alt=""
          width={76}
          height={76}
          priority
          className="rounded-[1.4rem] bg-white/95 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
          style={{ width: 76, height: 76 }}
        />

        <p className="mt-5 font-[family-name:var(--font-titre)] text-3xl text-white">
          Siira
        </p>

        {/* Le trait se trace : c'est « le chemin », le sens du nom en dioula. */}
        <span className="splash-trait mt-3 block h-[2px] w-24 rounded-full bg-rose-400" />

        <p className="mt-4 text-sm text-rose-100/70">Le chemin vers les soins</p>
      </div>
    </div>
  );
}
