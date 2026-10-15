# Système de design de Siira

Document de la Phase 0. Il explique sur quoi reposent les choix visuels, et
sert de référence pour tout nouvel écran. La page `/design` en est la version
vivante, à regarder dans un navigateur.

---

## 1. Ce que dit la recherche

### Accessibilité — WCAG 2.2 niveau AA

Source : <https://www.w3.org/WAI/WCAG22/quickref/>

Retenu pour Siira :

| Critère | Exigence | Ce que nous faisons |
|---|---|---|
| 1.4.3 Contraste minimum | 4,5:1 pour le texte courant | Toutes les paires de couleurs vérifiées, section 3 |
| 1.4.1 Utilisation de la couleur | La couleur ne porte jamais seule l'information | Chaque niveau d'urgence affiche **la couleur ET le mot** |
| 2.5.5 Taille de la cible | 44 × 44 px au minimum | Jeton `--spacing-cible: 2.75rem`, appliqué à tout élément cliquable |
| 2.4.7 Visibilité du focus | Focus toujours visible | Contour rose de 3 px, jamais supprimé |
| 3.3.1 / 3.3.3 Erreurs | Erreur identifiée et solution suggérée | Message sous le champ fautif, en français, qui dit quoi faire |
| 2.4.1 Contournement de blocs | Lien d'évitement | « Aller au contenu » en début de page |

### Utilisabilité — heuristiques de Nielsen

Source : <https://www.nngroup.com/articles/ten-usability-heuristics/>

Les quatre qui pèsent le plus ici :

1. **Visibilité de l'état du système.** Chaque dossier affiche où il en est, en
   mots simples (« Dossier envoyé au centre », « Patiente reçue au centre »).
2. **Correspondance avec le monde réel.** Le vocabulaire est celui du soignant,
   jamais celui de la base de données. Aucun « statut validee » à l'écran.
3. **Contrôle à l'utilisateur.** L'agent peut corriger chaque champ de la fiche
   et le niveau proposé. Rien ne part sans son geste explicite.
4. **Prévention des erreurs.** Le bouton « Analyser le cas » reste inactif tant
   que le consentement n'est pas coché : l'erreur est rendue impossible plutôt
   que signalée après coup.

### Lois de l'UX

Source : <https://lawsofux.com/>

- **Loi de Hick** (plus il y a de choix, plus la décision est lente) : un écran,
  une décision. L'agent voit le niveau, puis valide ou corrige. Rien d'autre.
- **Loi de Fitts** (une cible proche et grande s'atteint plus vite) : sur
  téléphone, l'action principale est fixée en bas de l'écran, à portée du pouce,
  sur toute la largeur.
- **Loi de Miller** (la mémoire courte est limitée) : la fiche structurée est
  découpée en groupes courts ; les champs qui dépendent d'une réponse
  n'apparaissent que si cette réponse est oui.

### Formulaires et langage — GOV.UK et NHS

Sources : <https://design-system.service.gov.uk/patterns/question-pages/> et
<https://service-manual.nhs.uk/content/how-we-write>

- **« Une chose par page »** du GOV.UK, appliqué au parcours : la consultation
  pose une question à la fois, puis viennent le résultat, l'orientation et la
  confirmation d'envoi. Un écran, un moment.
- **Écriture NHS** : phrases courtes, voix active, mots du quotidien. « Une boule
  dans le sein », pas « masse mammaire ». « Depuis combien de semaines », pas
  « durée d'évolution ».
- Les libellés disent ce qu'il faut faire, pas ce que fait le logiciel :
  « Envoyer le dossier », pas « Soumettre le formulaire ».

### Mobile — Material Design 3 et Apple HIG

Sources : <https://m3.material.io/foundations/accessible-design/accessibility-basics>
et <https://developer.apple.com/design/human-interface-guidelines/accessibility>

- Cible tactile de 48 dp (Material) / 44 pt (Apple) : nous retenons 44 px, qui
  satisfait les deux et WCAG 2.5.5.
- Clavier adapté à la saisie : `inputMode="numeric"` pour l'âge et le téléphone,
  ce qui évite à l'agent de chercher les chiffres.
- Une seule colonne sur téléphone, jamais de tableau à faire défiler
  horizontalement : sur petit écran, les listes deviennent des cartes.

### Interfaces médicales et tableaux de bord

- Le niveau d'urgence est l'information la plus importante de l'écran de
  résultat : il occupe un grand bandeau en haut, avant tout le reste.
- La liste du centre est triée par gravité (rouge, puis orange, puis date) :
  l'information critique n'est jamais à chercher.
- Les chiffres de pilotage (espace admin, accueil de l'agent, liste du centre)
  sont tous calculés à partir des cas réels ; aucun n'est écrit en dur.

### Performance sur réseau faible

- Deux polices seulement, deux à trois graisses chacune, servies par le site.
- Aucune image décorative : les seules images sont le logo et les icônes.
- Budget visé et constaté : moins de 100 Ko par page hors polices. L'audit
  mesure 6 Ko de contenu sur la page de connexion.

---

## 2. Principes de design propres à Siira

1. **Une décision par écran.** L'agent a la patiente en face de lui. Chaque
   écran pose une question et attend une réponse.
2. **La couleur ne décide jamais seule.** Un niveau d'urgence, c'est une
   couleur, un mot, et une phrase de délai.
3. **Le mot juste, pas le mot savant.** Si une infirmière ne dirait pas ce mot à
   une patiente, il ne va pas à l'écran.
4. **L'humain garde la main, visiblement.** Chaque écran de résultat montre que
   le logiciel propose et que l'agent décide.
5. **Sobriété éditoriale.** Beaucoup de blanc, une hiérarchie typographique
   nette, aucun effet décoratif. Le sujet est grave, le ton est calme.
6. **Le pouce d'abord.** Sur téléphone, l'action principale est en bas, grande,
   atteignable d'une main.

---

## 3. Palette et contrastes

Le rose `#D6336C` est imposé. Tout le reste est construit autour de lui : un
prune foncé issu du logo, des neutres chauds qui s'accordent au prune, et trois
couleurs d'urgence qui diffèrent **par la teinte et par la luminosité**.

### Marque

| Jeton | Valeur | Usage | Contraste sur `sable-50` |
|---|---|---|---|
| `rose-600` | `#D6336C` | Actions principales, focus, accents | 4,8:1 — conforme AA |
| `rose-700` | `#B61F56` | Survol, liens en texte | 6,9:1 |
| `rose-50` | `#FDF2F6` | Fond des éléments sélectionnés | fond |
| `prune-900` | `#2A1A20` | Texte courant, titres | 15,8:1 |
| `prune-700` | `#44303B` | Texte secondaire | 10,2:1 |
| `sable-600` | `#5D5650` | Texte d'aide, légendes | 6,4:1 |
| `sable-50` | `#FBFAF9` | Fond général | — |

### Niveaux d'urgence

Chaque niveau a un fond clair, une bordure, et une couleur forte pour le texte
et la pastille. Les trois fonds ont des luminosités distinctes, et le mot est
toujours écrit : l'information passe sans percevoir les couleurs.

| Niveau | Fond | Bordure | Couleur forte | Texte | Contraste texte/fond |
|---|---|---|---|---|---|
| Vert | `#E8F4ED` | `#A9D4BD` | `#146B4A` | `#0E4E36` | 8,9:1 |
| Orange | `#FDF1E2` | `#EFC98F` | `#9A5B00` | `#6F4200` | 8,1:1 |
| Rouge | `#FBE9E9` | `#EDA9AC` | `#B3121B` | `#8A0E15` | 8,4:1 |

Aucune couleur n'est écrite en dur dans un composant : tout passe par les
jetons de `globals.css`.

---

## 4. Typographie

| Rôle | Police | Graisses | Pourquoi |
|---|---|---|---|
| Titres | Fraunces (à empattements) | 400, 600 | Donne le caractère éditorial et chaleureux demandé ; fait écho au logo, lui-même à empattements |
| Texte | Inter (sans empattements) | 400, 500, 600 | Très lisible en petit corps sur écran d'entrée de gamme |

Texte courant à 16 px, interlignage 1,6. Les titres ont un interlignage de 1,2
et un léger resserrement (`-0.015em`). Les polices sont servies par le site,
avec `display: swap`, pour que le texte s'affiche avant leur chargement.

---

## 5. Espacements, rayons, ombres

- **Espacements** : échelle de Tailwind par multiples de 4 px. Entre blocs,
  16 px sur téléphone, 24 px sur ordinateur.
- **Rayons** : `petit` 6 px (puces), `moyen` 10 px (champs, boutons),
  `grand` 16 px (cartes). La forme en pilule est réservée aux étiquettes.
- **Ombres** : deux niveaux, très discrets. Les cartes sont posées, pas
  surélevées. Aucune ombre lourde, aucun dégradé décoratif.

---

## 6. Composants

Écrits à la main, sans bibliothèque de composants. Le périmètre est restreint
(boutons, champs, listes, cases, cartes, étiquettes) et les exigences
d'accessibilité sont précises : les écrire nous-mêmes coûte moins cher que
d'habiller une bibliothèque, et évite d'embarquer du code inutile sur un réseau
3G. Nous nous appuyons sur les éléments natifs `button`, `a`, `label`, `input`,
`select`, `fieldset`, qui apportent gratuitement le clavier et les lecteurs
d'écran.

| Composant | Fichier | Points d'attention |
|---|---|---|
| `Bouton`, `BoutonLien` | `components/Bouton.tsx` | 4 variantes, hauteur minimale 44 px, état de chargement annoncé par `aria-busy` |
| `Champ`, `ZoneTexte`, `Liste` | `components/Champs.tsx` | `label` toujours relié, erreur reliée par `aria-describedby`, `aria-invalid` sur le champ fautif |
| `ChoixUnique`, `CaseACocher` | `components/Champs.tsx` | Grandes zones cliquables, `fieldset` et `legend` |
| `BadgeNiveau`, `BandeauNiveau` | `components/BadgeNiveau.tsx` | Couleur **et** mot, toujours |
| `Carte`, `EtatVide`, `MessageErreur`, `MessageSucces`, `Squelette` | `components/Interface.tsx` | Tous les états d'un écran : chargement, vide, erreur, succès |
| `MentionPasDeDiagnostic` | `components/Interface.tsx` | Présente sur chaque écran de résultat |
| `Espace`, `BarreAction` | `components/Espace.tsx` | Coquille par rôle ; barre d'action fixée en bas sur téléphone |
| `Pliant`, `EnTeteEtapes`, `Question`, `Rappel`, `BarreEtape` | `components/Parcours.tsx` | Le parcours d'une consultation : une question par étape, un bloc qu'on déplie (`details` natif) pour les listes longues |
| `SurveillanceTexte`, `SurveillanceRecommandee` | `components/Surveillance.tsx` | Ce qu'il faut surveiller selon l'âge, affiché quand aucun signe inquiétant n'est relevé |

---

## 7. Vérifications faites

- Contrastes calculés pour chaque paire texte/fond du tableau ci-dessus.
- Audit automatisé (`scripts/audit.js`) sur 4 largeurs : aucun débordement
  horizontal, aucun défaut d'accessibilité de base, aucune erreur console.
- Parcours complet rejoué dans un vrai navigateur (`scripts/recette.js`),
  agent à 360 px et centre à 1280 px.
