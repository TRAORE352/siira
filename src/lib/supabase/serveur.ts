/**
 * Client Supabase SERVEUR, muni de la clé de service.
 *
 * ATTENTION — ce client CONTOURNE toutes les politiques RLS de la base. Il ne
 * doit vivre que dans du code serveur : routes API, actions serveur,
 * composants serveur. Le `import 'server-only'` fait échouer la construction
 * si un composant client l'importe, par erreur ou par une chaîne d'imports.
 *
 * Il n'a donc pas sa place dans les chemins qui servent une requête d'agent ou
 * de centre : ceux-là passent par la session de l'utilisateur, pour que la
 * base applique ses propres règles. Ce client sert aux travaux
 * d'administration, aux tâches de fond et aux écritures que l'on fait au nom
 * du système (journal, orientations créées par une règle).
 */
import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { environnementPublic, messageVariableManquante } from './environnement';

/** Une seule instance par processus : inutile d'en recréer à chaque appel. */
let instance: SupabaseClient | null = null;

/** Vrai quand la clé de service est posée. Ne révèle pas sa valeur. */
export function cleDeServiceEstPosee(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Client à pouvoirs étendus. Échoue tôt, et avec un message utile, quand la
 * clé manque : un service qui démarre sans sa clé écrirait dans le vide.
 */
export function clientDeService(): SupabaseClient {
  if (instance) return instance;

  const { url } = environnementPublic();
  const cleDeService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cleDeService) {
    throw new Error(messageVariableManquante('SUPABASE_SERVICE_ROLE_KEY'));
  }
  if (cleDeService.startsWith('sb_publishable_')) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY contient une cle PUBLIABLE (prefixe sb_publishable_), pas la cle de service. Reprenez-la dans Supabase : Project Settings, API Keys, service_role.",
    );
  }

  instance = createClient(url, cleDeService, {
    auth: {
      // Aucun utilisateur derrière ce client : pas de session à stocker ni à
      // rafraîchir, et surtout rien à lire dans l'URL.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return instance;
}
