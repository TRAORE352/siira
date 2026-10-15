# Siira (Sira Rose)

Plateforme d'orientation et de financement des soins pour le cancer du sein, du centre de santé au spécialiste.

Projet réalisé pour le **Hackathon Octobre Rose 2026** — Orange Digital Center Ouagadougou.

## Le parcours

1. **Repérer** — l'agent de santé enregistre le récit de la patiente ; l'IA structure l'information et propose un niveau d'urgence (vert / orange / rouge), que l'agent valide ou corrige.
2. **Orienter** — l'application choisit le centre spécialisé le plus adapté et lui transmet le dossier.
3. **Financer** — les ONG partenaires reçoivent une demande adaptée au cas et peuvent l'accepter ; l'argent va au centre de soins, jamais à la patiente.

**L'application ne pose jamais de diagnostic.** Elle évalue un niveau d'urgence. Seuls les examens médicaux confirment un cancer.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS (charte graphique dans `app/globals.css`)
- Supabase (PostgreSQL, Auth, Realtime, RLS)
- API DeepSeek (extraction de la fiche, explication, résumé)

## Démarrer

```bash
npm install
npm run dev
```

## Tests (règles de classement + matching)

```bash
npx tsx scripts/test.ts
```

## Structure

- `lib/regles.ts` — règles de classement du niveau d'urgence (section 6.1)
- `lib/matching.ts` — calcul du score de matching des centres (section 6.2)
- `lib/types.ts` — modèle de données (section 10)
- `app/` — écrans et routes API
- `supabase/` — migrations et données de démo

## Référence

Cahier des charges fonctionnel et technique (MVP), version 1.0 du 13 octobre 2026.
