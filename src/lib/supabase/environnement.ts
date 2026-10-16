/**
 * Environnement Supabase : lecture et validation des variables.
 *
 * Module SANS secret : il ne lit que les valeurs publiques (URL, clé
 * publiable). Il peut donc être importé depuis un composant client sans
 * risque. La clé de service est lue uniquement par `serveur.ts`.
 */

/** Variables visibles par le navigateur : publiques par conception. */
export type EnvironnementPublic = {
  readonly url: string;
  readonly clePubliable: string;
};

/**
 * Message d'erreur uniforme pour une variable manquante.
 * On nomme la variable, jamais sa valeur.
 */
export function messageVariableManquante(nom: string): string {
  return `Variable d'environnement manquante : ${nom}. Renseignez-la dans .env.local (en local) ou dans les variables du projet Vercel (en ligne), puis reconstruisez : les variables sont lues a la construction.`;
}

/** Vrai quand la configuration publique est complète. */
export function supabaseEstConfigure(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/**
 * Lit la configuration publique, ou échoue avec un message qui dit quoi faire.
 *
 * On accepte les deux noms de clé publiable : Supabase a renommé
 * `anon` en `publishable`, et les deux cohabitent selon l'âge du projet.
 */
export function environnementPublic(): EnvironnementPublic {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error(messageVariableManquante('NEXT_PUBLIC_SUPABASE_URL'));

  const clePubliable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!clePubliable) {
    throw new Error(messageVariableManquante('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'));
  }

  return { url, clePubliable };
}
