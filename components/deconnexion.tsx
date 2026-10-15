"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Bouton de déconnexion (exigence CO-03). */
export default function Deconnexion() {
  const router = useRouter();

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={seDeconnecter}
      className="w-full rounded-bouton px-4 py-3 text-left text-sm font-medium text-texte-principal hover:bg-rose-clair"
    >
      Déconnexion
    </button>
  );
}
