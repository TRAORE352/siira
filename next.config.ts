import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /*
   * Les écrans de Siira lisent des données propres au navigateur (session,
   * état de la démonstration). Les précalculer sur le serveur n'a pas de sens
   * et produit des avertissements : on laisse Next les rendre à la demande.
   */
  cacheComponents: false,
  partialPrefetching: false,
};

export default nextConfig;
