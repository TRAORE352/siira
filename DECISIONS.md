# Décisions

Choix faits pendant le développement, et leur raison. Un point par décision.
Les questions encore ouvertes sont regroupées à la fin.

---

## Phase 0 — design

**D1. Composants écrits à la main plutôt que shadcn/ui ou Radix.**
Le brief autorise une bibliothèque si elle est justifiée. Notre périmètre de
composants est restreint et nos exigences d'accessibilité sont précises et
connues. Les éléments natifs (`button`, `label`, `select`, `fieldset`) donnent
déjà le clavier et les lecteurs d'écran. Écrire les composants nous-mêmes évite
d'embarquer du code inutile sur un réseau 3G et nous laisse le contrôle complet
du rendu. Détail dans `DESIGN.md`.

**D2. Fraunces pour les titres, Inter pour le texte.**
Le logo est à empattements : une police à empattements pour les titres fait
écho à la marque et donne le ton éditorial demandé. Inter reste très lisible en
petit corps sur un écran d'entrée de gamme. Deux à trois graisses chacune, pour
tenir le budget de poids.

**D3. Le logo utilise le fichier image fourni.**
`public/brand/siira-logo.png` était disponible. Le composant `Logo` l'encapsule :
si le fichier définitif change, un seul fichier est à toucher.

---

## Phase 1 — architecture

**D4. L'état de la démonstration vit dans le navigateur, derrière une interface unique.**
Tous les écrans passent par `lib/data/index.ts`, dont les fonctions ont déjà la
forme qu'elles auront avec Supabase. L'implémentation actuelle (`lib/data/magasin.ts`)
garde l'état dans `localStorage`. En Phase 2, on remplace l'implémentation sans
toucher à un seul écran, comme l'exige la section 8.3 du dossier.

**D5. Temps réel simulé par `BroadcastChannel`, avec repli sur l'évènement `storage`.**
`BroadcastChannel` transmet les changements entre onglets instantanément.
Certains navigateurs anciens ne le proposent pas : l'évènement `storage` prend
alors le relais. Mesuré pendant la recette : le dossier arrive chez le centre en
environ 2 secondes, sous les 3 secondes exigées.

**D6. La session est propre à chaque onglet (`sessionStorage`), les données sont partagées (`localStorage`).**
Pendant la démonstration, l'agent, le centre et l'ONG sont ouverts côte à côte
dans trois onglets du même navigateur. Avec une session en `localStorage`, se
connecter dans un onglet déconnectait les autres : la démonstration était
impossible. Séparer les deux stockages résout cela proprement.

**D7. `useSyncExternalStore` pour lire la session et les données.**
C'est le mécanisme prévu par React pour s'abonner à une source extérieure. Il
évite les effets qui déclenchent des rendus en cascade, et donne un rendu
serveur stable. Aucune règle de lint n'est désactivée.

**D8. `cacheComponents` et `partialPrefetching` désactivés dans `next.config.ts`.**
Ces options précalculent les pages sur le serveur. Or tous nos écrans lisent des
données propres au navigateur : le précalcul n'a aucun sens ici et produisait des
avertissements à chaque navigation. Les deux options sont liées entre elles et
ont donc été désactivées ensemble.

**D9. L'IA simulée reconnaît un récit par mots-clés, après normalisation.**
`lib/cache-demo.ts` compare le récit, accents et ponctuation retirés, aux mots
caractéristiques de chaque cas de démonstration. La dictée ne produit jamais
exactement le même texte : une comparaison stricte aurait échoué en direct
devant le jury. Pour tout autre récit, la fiche s'affiche vide et l'agent la
remplit à la main, comme prévu par le dossier.

**D10. Le nom de la patiente est retiré du récit avant toute analyse.**
`anonymiserRecit()` remplace chaque partie du nom d'au moins trois lettres par
« la patiente ». Déjà en place en Phase 1, alors qu'aucune donnée ne sort du
navigateur : la fonction sera ainsi déjà testée quand DeepSeek sera branché.

**D11. Le niveau est recalculé à l'écran à chaque modification de la fiche.**
L'écran de résultat appelle `classer()` directement pendant le rendu, en plus
d'enregistrer la fiche. L'agent voit le niveau changer à l'instant où il corrige
un champ, sans attendre un aller-retour.

**D12. Les indicateurs qui dépendent de l'heure sont calculés dans la couche données.**
« Rendez-vous cette semaine » utilise l'heure courante. Calculé pendant le rendu,
cela rend le rendu impur. Le calcul se fait donc avec la lecture des données.

**D13. Le montant demandé est arrondi aux 100 FCFA supérieurs.**
Un paiement partiel donne des montants comme 32 500 FCFA. On ne demande pas des
unités à une ONG. Arrondi vers le haut, pour ne jamais sous-financer.

**D14. La réinitialisation de la démonstration est dans l'espace admin, avec confirmation.**
Exigence AD-02. Un double clic volontaire est demandé, l'action étant
irréversible et potentiellement déclenchée devant le jury.

**D19. Exception de lint limitée aux scripts en ligne de commande.**
Les fichiers de `scripts/` sont lancés directement par Node et sont écrits en
CommonJS : `require` y est la forme normale, pas une faute. Plutôt que de
désactiver la règle partout, l'exception est enfermée dans un bloc limité à
`scripts/**/*.js` (`eslint.config.mjs`). L'application reste en TypeScript
strict avec imports ES, et la règle s'y applique toujours. Le dossier exige un
lint sans erreur (section 16) : c'est désormais le cas sur l'ensemble du dépôt.

**D20. Le déploiement de production suit la branche `main`.**
Le projet Vercel `siira` est relié au dépôt GitHub `TRAORE352/siira`, avec
`main` comme branche de production. Un push sur `main` déclenche donc la mise
en ligne : pas de déploiement manuel à faire, et pas de risque de publier une
version différente de celle du dépôt. Les secrets ne passent jamais par le
dépôt : `.env.local` est ignoré, et les variables de la Phase 2 seront saisies
dans les réglages Vercel.

**D21. Trois adresses dédiées, plus une adresse de démonstration.**
Quatre projets Vercel servent le même dépôt : `siira-agent`,
`siira-centre`, `siira-ong`, et `siira` pour l'application complète. Chacun
fixe son espace par `NEXT_PUBLIC_ESPACE`. Raison : le commanditaire veut trois
liens, un par public, et une adresse qui n'ouvre que son espace évite qu'un
agent découvre les écrans du centre. L'adresse complète est conservée parce que
l'état de la démonstration vit dans le stockage du navigateur, propre à chaque
adresse : c'est la seule où le parcours complet se joue entre trois onglets. Le
partage entre les trois adresses viendra avec Supabase, en Phase 2.

**D22. Les autres espaces sont refusés, pas seulement cachés.**
Un middleware s'exécute avant tout rendu et renvoie vers la connexion si le
chemin demandé n'appartient pas à l'espace de l'adresse. Masquer un lien ne
protège rien : l'adresse se tape à la main. Trois barrières se répondent :
le middleware (serveur), la coquille `Espace` (qui ferme une session d'un autre
rôle), et la liste des comptes proposés à la connexion.

**D23. Application installable pour l'agent.**
`app/manifest.ts` produit un manifeste par espace : installée depuis l'adresse
de l'agent, l'application s'ouvre directement sur ses patientes, sans barre de
navigateur. Le service worker (`public/sw.js`) reste volontairement modeste :
réseau d'abord pour les écrans, cache d'abord pour les fichiers qui ne changent
jamais. Il est enregistré depuis la mise en page, donc sur toutes les pages :
s'il ne l'était qu'après la connexion, une personne sans session ne pourrait
pas installer l'application, car l'invitation du navigateur suppose un service
worker déjà actif. Le bouton d'installation n'apparaît que lorsque le
navigateur le propose réellement ; sur iPhone, où il n'existe pas, une phrase
explique la marche à suivre plutôt qu'un bouton inerte.

**D24. L'arrêt des serveurs ne dépend plus de `fuser` ni de `lsof`.**
Ces outils ne sont pas présents partout, et le script d'origine échouait en
silence : un serveur restait en vie, servait un mélange de deux constructions et
répondait des erreurs 500 sur des fichiers javascript disparus. Les contrôles
devenaient alors faux sans que rien ne le signale. `scripts/liberer-ports.sh`
retrouve le processus qui écoute sur un port par `/proc/net/tcp` et ses
descripteurs de fichiers, et attend que le port cesse de répondre avant de
rendre la main. Le vérificateur d'espaces contrôle en plus que tous les
fichiers javascript demandés par une page sont réellement servis, ce qui
détecte ce mélange de constructions, en local comme en production.

**D25. L'agent se connecte par numéro de téléphone et code à 6 chiffres.**
Un agent de santé au Burkina Faso n'a pas forcément d'adresse électronique, et
retenir un mot de passe libre sur un clavier de téléphone d'entrée de gamme est
une source d'échec quotidienne. Il a en revanche toujours son numéro. L'écran
demande donc deux choses : le numéro, avec l'indicatif `+226` affiché mais non
saisissable — il ne change jamais, le rendre modifiable n'offre qu'une occasion
de se tromper — et un code à 6 chiffres. `lib/telephone.ts` valide les préfixes
mobiles burkinabè, format actuel comme ancien, et les messages d'erreur disent
ce qui manque (« Il manque 2 chiffres à ce numéro ») plutôt que « numéro
invalide ». En Phase 1 aucune vérification n'a lieu : tout numéro valide et
tout code à 6 chiffres ouvrent l'espace. Un même numéro retrouve toujours le
même agent de démonstration, par la somme de ses chiffres, sinon la liste des
patientes changerait à chaque connexion.

**D26. Les six cases du code sont une seule zone de saisie.**
Les six `input` séparés que l'on voit partout cassent le collage d'un code reçu
par SMS, perturbent le clavier numérique de certains téléphones et déroutent
les lecteurs d'écran. Ici, un champ unique rendu transparent couvre la rangée
et reçoit la frappe ; les six cases ne font que montrer son contenu. Le champ
reste réellement présent et focusable — jamais `display:none`, qui le couperait
du clavier.

**D27. Aucun compte de démonstration sur l'adresse de l'agent.**
L'écran que voit l'agent doit être celui qu'il ouvrira tous les matins, pas une
maquette avec une liste de personnages. Les autres espaces gardent la connexion
par compte : ils travaillent sur ordinateur, et l'adresse de démonstration doit
ouvrir les quatre rôles côte à côte pour le jury. Le vérificateur d'espaces
contrôle désormais qu'aucun nom de démonstration, aucune adresse `@siira.demo`
et aucun champ de mot de passe ne sont servis sur l'adresse de l'agent.

**D28. L'accueil de l'agent porte son propre en-tête.**
`Espace` accepte `entete="aucun"` : l'écran pose alors son bandeau de marque
d'un bord à l'autre, avec la salutation, le centre de rattachement, le numéro
connecté et trois nombres (patientes, en attente, à revoir). La barre commune,
pensée pour les écrans d'ordinateur, écrasait cette hiérarchie. L'action
principale — « Nouvelle consultation » — descend en barre fixe, à portée du
pouce : en haut de page, il fallait remonter toute la liste pour l'atteindre.

---

## Données de démonstration

**D15. Tarifs retenus pour la démonstration, identiques dans tous les centres.**
Consultation 10 000 FCFA, échographie 15 000, biopsie 35 000, transport 5 000.
Un cas rouge sans capacité de paiement demande donc 65 000 FCFA. Ces montants
sont **indicatifs** et attendent validation (point ouvert du dossier, §18).

**D16. Noms d'ONG inventés : « Fonds Yennenga » et « Alliance Wendpanga ».**
Le dossier demande des noms fictifs. Ces deux noms sont burkinabè et crédibles,
sans désigner d'organisation réelle.

**D17. Coordonnées des districts et des centres relevées publiquement.**
Approximatives, suffisantes pour que les distances à vol d'oiseau soient
réalistes. À vérifier avant toute utilisation réelle.

**D18. Les créneaux des centres commencent à des jours différents.**
Yalgado à J+1, Bogodogo à J+2, Tengandogo à J+4, Ziniaré à J+9. Le matching
produit ainsi des résultats contrastés et démontrables, au lieu de toujours
choisir le même centre pour la même raison.

---

## Points à faire valider

1. **Les règles de classement** (section 6.1 du dossier) doivent être relues par
   une professionnelle de santé. Elles vivent dans `lib/regles.ts`, sous forme
   d'un tableau lisible, modifiable sans toucher au reste du code.
2. **Les tarifs de démonstration** (D15) : montants à confirmer.
3. **Le fichier définitif du logo**, à déposer dans `public/brand/`.
4. **Les clés Supabase, DeepSeek et l'accès Vercel**, à fournir au début de la
   Phase 2.
