// Client Supabase service_role — serveur UNIQUEMENT.
// Utilisé pour les opérations qui dépassent les droits d'un rôle (création des
// financements par le système, appel de la fonction confirmer_financement,
// réinitialisation de la démo). Jamais exposé au navigateur.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
