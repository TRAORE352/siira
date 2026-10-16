/**
 * Client Supabase du NAVIGATEUR.
 *
 * Celui-ci porte la session de l'utilisateur : la base applique donc ses
 * politiques RLS normalement. C'est le client de tous les écrans. Il n'a aucun
 * pouvoir particulier, et c'est voulu — le client à pouvoirs étendus vit dans
 * `serveur.ts`, verrouillé par `server-only`.
 */
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { environnementPublic } from './environnement';

let instance: SupabaseClient | null = null;

/** Une seule instance par onglet : deux clients se disputeraient la session. */
export function clientNavigateur(): SupabaseClient {
  if (instance) return instance;
  const { url, clePubliable } = environnementPublic();
  instance = createBrowserClient(url, clePubliable);
  return instance;
}
