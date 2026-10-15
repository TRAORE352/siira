<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Comment on travaille sur ce dépôt

**Tout le travail va directement sur `main`.** Chaque poussée sur `main`
déclenche le déploiement des deux adresses en ligne (`siira-agent` et
`siira-centre`) : c'est ce qui fait que les corrections se voient tout de
suite. Il n'y a donc plus de branche par fonctionnalité ni de pull request à
attendre — mais la contrepartie est qu'on ne pousse rien qui ne soit vérifié.

Avant chaque envoi, ces cinq commandes doivent passer :

```sh
npm test            # règles, matching, financement, libellés
npx tsc --noEmit    # types
npm run lint        # eslint
npm run audit       # 14 écrans : débordement, cibles 44 px, libellés, console
npm run recette     # le parcours complet dans un vrai navigateur
```

Pour la lisibilité d'un écran (texte coupé, contraste, ce qui passe sous une
barre fixe) :

```sh
node scripts/verifier-lisibilite.js --chemin /agent --largeur 360
node scripts/verifier-lisibilite.js --chemin /centre --largeur 1280
node scripts/verifier-lisibilite.js --chemin /agent --stress   # noms longs
```

Règles de fond :

- **Un commit par sujet**, en français, message court et explicite, sans
  accent dans la première ligne. Le corps dit pourquoi, pas seulement quoi.
- **Tout est en français** : noms de fichiers, fonctions, variables,
  commentaires, interface.
- **Aucun secret dans le dépôt** : les clés vivent dans les variables
  d'environnement de Vercel.
- **Les choix et leurs raisons** vont dans `DECISIONS.md`, numérotés à la
  suite. Le système de design vit dans `DESIGN.md`.
- **L'accessibilité n'est pas optionnelle** : cible tactile de 44 px, contraste
  de 4,5 pour 1 sur le petit texte, un seul `h1` par écran.
- **Aucune couleur écrite en dur** : tout passe par les jetons de
  `src/app/globals.css`.

