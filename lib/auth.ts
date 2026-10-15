// Vérification d'authentification et de rôle pour les routes API (section 9.3).
// Chaque route vérifie que l'utilisateur est connecté et a le bon rôle.
import type { Role } from "./types";
import { createClient } from "./supabase/server";

export interface ContexteUtilisateur {
  userId: string;
  profilId: string;
  role: Role;
  centreId: string | null;
  ongId: string | null;
}

export async function getUtilisateur(): Promise<ContexteUtilisateur | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("profils")
    .select("id, role, centre_id, ong_id")
    .eq("user_id", user.id)
    .single();

  if (!profil) return null;

  return {
    userId: user.id,
    profilId: profil.id,
    role: profil.role as Role,
    centreId: profil.centre_id,
    ongId: profil.ong_id,
  };
}

export function nonAutorise(message = "Accès refusé") {
  return Response.json({ error: message }, { status: 403 });
}
