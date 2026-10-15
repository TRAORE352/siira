# Travailler sur l'espace centre — marche à suivre

Ce document s'adresse à **Morelle**, qui développe l'espace centre de santé.

Il explique comment porter ton travail dans le dépôt commun
`github.com/TRAORE352/siira`, et comment y travailler ensuite sans marcher sur
le code de l'espace agent.

---

## 1. Le problème à régler

Tu travailles aujourd'hui dans `github.com/moffomorelle1/siira`. Ce dépôt
**n'est pas un fork** du dépôt commun : GitHub ne relie pas les deux. Ton
travail est donc invisible depuis le dépôt commun, et le restera quoi que tu
fasses — aucune pull request n'est possible, aucune notification n'arrive.

Tant que les deux dépôts restent séparés, **il n'existe aucune application
Siira complète** : seulement deux moitiés qui ne se rencontrent jamais.
L'espace agent ne peut pas envoyer un dossier à ton espace centre.

Tu as déjà les droits d'écriture sur le dépôt commun (ton invitation est
acceptée). Il n'y a rien à demander, il suffit de l'utiliser.

---

## 2. Les deux différences qui bloquent

### a. L'emplacement des fichiers

| Chez toi | Dans le dépôt commun |
|---|---|
| `app/centre/page.tsx` | `src/app/centre/page.tsx` |
| `lib/centre.ts` | `src/lib/centre.ts` |
| `components/liste-patientes.tsx` | `src/components/ListePatientes.tsx` |

Tout vit sous `src/`. Les composants sont nommés en **PascalCase**
(`ListePatientes.tsx`), pas en tirets.

L'alias `@/` pointe sur `src/` : on écrit `import { Bouton } from
"@/components/Bouton"`.

### b. D'où viennent les données

Ton code lit Supabase. Le dépôt commun **n'a pas de base de données** : les
données vivent en mémoire dans le navigateur, et c'est volontaire pour cette
phase. Supabase viendra en Phase 2, pour les deux espaces en même temps.

Concrètement, remplace tes appels Supabase par les fonctions déjà écrites
dans `src/lib/data/index.ts` :

```ts
import {
  listerDossiersCentre,  // les dossiers orientés vers ce centre
  construireDossier,     // le détail d'un dossier
  enregistrerSuivi,      // le centre enregistre la suite donnée
  trouverCreneau,        // un créneau de rendez-vous
  trouverCentre,         // un centre par son identifiant
  lireEtat,              // l'état complet (créneaux compris)
} from "@/lib/data";
import { useDonnees } from "@/lib/hooks";
import { useSession } from "@/lib/session";
```

Elles sont synchrones, elles ne renvoient pas de promesse. Pas de `await`, pas
de route d'API : l'écran appelle la fonction et affiche le résultat.

Pour qu'un écran se rafraîchisse quand l'agent envoie un dossier, utilise le
crochet prévu — il réagit aussi aux changements venus d'un autre onglet :

```ts
const { donnees, pret } = useDonnees(() => listerDossiersCentre(centreId));
if (!pret) return <Chargement />;
```

L'identifiant du centre connecté se lit dans la session :

```ts
const { profil } = useSession();   // profil.centre_id
```

L'écran `src/app/centre/disponibilites/page.tsx` montre ces trois éléments
utilisés ensemble — c'est le meilleur exemple à copier.

---

## 3. Ce qui est déjà écrit — à réutiliser, pas à réécrire

Ces composants existent et portent l'identité visuelle de Siira. Les
réutiliser garantit que les deux espaces se ressemblent.

| Composant | À quoi il sert |
|---|---|
| `@/components/Espace` | La coquille d'un écran protégé : en-tête, navigation, contrôle du rôle |
| `@/components/Bouton` | Boutons (`principal`, `second`, `discret`, `danger`) |
| `@/components/BadgeNiveau` | Pastille et bandeau de niveau d'urgence |
| `@/components/Interface` | `Carte`, `TitreSection`, `Ligne`, `MessageErreur`, `MessageSucces`, `EtatVide`, `Chargement` |
| `@/components/Champs` | Champs de formulaire étiquetés et accessibles |

**Aucune couleur écrite en dur.** Toutes passent par les jetons de
`src/app/globals.css` : `text-prune-900`, `bg-rose-600`, `border-sable-200`…
Le rose de la marque est `#D6336C`, jamais écrit ailleurs qu'en jeton.

Un écran de référence existe : ouvre `/design` dans l'application, il montre
tous les composants et toutes les couleurs disponibles.

---

## 4. Comment porter ton travail, étape par étape

```sh
# 1. recuperer le depot commun
git clone https://github.com/TRAORE352/siira.git
cd siira
npm install

# 2. creer ta branche de travail
git switch -c espace-centre

# 3. verifier que tout part d'une base saine
npm run lint && npm test && npm run build
```

Ensuite, écran par écran — **un commit par écran, pas un gros commit final** :

1. Copie un de tes écrans vers `src/app/centre/…`
2. Remplace les appels Supabase par les fonctions de `@/lib/data`
3. Remplace tes composants par ceux de `@/components` quand ils existent
4. Vérifie : `npm run lint && npx tsc --noEmit`
5. Commite

```sh
git add -A
git commit -m "Espace centre : tableau de bord des patientes recues"
git push origin espace-centre
```

Puis ouvre une **pull request** vers `main` sur GitHub. On relit ensemble
avant de fusionner.

---

## 5. Qui touche à quoi

Pour éviter les conflits, chacun reste dans sa zone.

| Zone | Qui |
|---|---|
| `src/app/centre/**` | **Morelle** |
| `src/app/agent/**` | Zozerigué |
| `src/components/**`, `src/lib/**`, `src/app/globals.css` | **Les deux — on se prévient avant** |

Les fichiers partagés sont la seule vraie source de conflits. Si tu as besoin
d'un nouveau composant commun ou d'une nouvelle fonction dans `lib/data`,
dis-le avant de l'écrire : il existe peut-être déjà sous un autre nom.

---

## 6. Vérifier son travail avant de pousser

```sh
npm run lint          # aucune erreur
npx tsc --noEmit      # aucune erreur de type
npm test              # 98 tests doivent passer
npm run build         # la construction doit reussir
```

Et pour voir l'espace centre seul, comme le verra un médecin :

```sh
NEXT_PUBLIC_ESPACE=centre npm run build
NEXT_PUBLIC_ESPACE=centre npm start
```

Il existe aussi une recette automatique qui contrôle l'espace entier :

```sh
node scripts/verifier-espaces.js --base http://localhost:3000 --espace centre
```

---

## 7. Deux règles de fond, valables partout

**L'accessibilité n'est pas optionnelle.** Toute action tactile fait au moins
44 px de haut (`min-h-[var(--spacing-cible)]`). Un seul `h1` par écran. Une
erreur s'explique en français, jamais par un code technique.

**Le français avant tout.** Noms de fichiers, de fonctions, de variables,
commentaires : tout en français, comme le reste du dépôt. `listerDossiers`,
pas `getDossiers`.

---

## En cas de doute

Regarde comment c'est fait côté agent : `src/app/agent/page.tsx` pour une
liste, `src/app/agent/consultation/[id]/confirmation/page.tsx` pour un écran
de détail. Les conventions y sont appliquées.
