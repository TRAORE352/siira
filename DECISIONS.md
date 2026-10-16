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
Pendant la démonstration, l'agent et le centre sont ouverts côte à côte
dans deux onglets du même navigateur. Avec une session en `localStorage`, se
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

**D21. Deux adresses déployées, une par public.**
Deux projets Vercel servent le même dépôt : `siira-agent` et `siira-centre`.
Chacun fixe son espace par `NEXT_PUBLIC_ESPACE`. Raison : le commanditaire
veut un lien par public, et une adresse qui n'ouvre que son espace évite qu'un
agent découvre les écrans du centre.

**Révision.** Une troisième adresse servait l'application complète pour les
démonstrations. Elle est supprimée : le commanditaire ne veut que deux liens.
Conséquence assumée — l'état de la démonstration vit dans le stockage du
navigateur, propre à chaque adresse, donc l'agent et le centre déployés ne
partagent pas leurs données. Montrer le parcours de bout en bout demande
désormais de servir l'application sans `NEXT_PUBLIC_ESPACE`, en local. Le
partage entre les deux adresses viendra avec Supabase, en Phase 2.

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

**D29. Le numéro n'est contrôlé que sur sa longueur. Aucun préfixe n'est refusé.**
La première version vérifiait que le numéro commençait par un préfixe mobile
« connu ». Elle refusait en production des numéros parfaitement réels :
les lignes fixes (`20` à Bobo-Dioulasso, `25` à Ouagadougou) et les tranches
`04`, `08`, `09`. Le plan de numérotation burkinabè a changé en 2021 et les
opérateurs ouvrent de nouvelles tranches sans prévenir : **toute liste de
préfixes écrite dans le code vieillit et finit par bloquer un agent devant son
propre numéro.** Laisser passer une saisie farfelue — que le serveur rejettera
en Phase 2 — est une faute sans conséquence ; empêcher quelqu'un de se
connecter n'en est pas une. `ressembleAMobile()` subsiste pour l'affichage et
les statistiques, avec l'interdiction explicite de servir à refuser une saisie.
Un test parcourt les dix premiers chiffres possibles pour que la règle ne
puisse pas être resserrée par inadvertance.

**D30. La page d'entrée de l'agent est un écran, pas une carte de visite.**
Elle ne portait qu'un logo, un titre et un petit bouton perdus dans du beige.
Elle occupe désormais tout l'écran sur le fond de marque, et annonce les trois
temps du travail de l'agent — dépister, orienter, suivre — dans l'ordre où il
les vit. L'action descend en bas, à portée du pouce. Les autres espaces, qui
travaillent sur ordinateur, gardent la page de présentation sobre.

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
ouvrir les deux espaces côte à côte pour le jury. Le vérificateur d'espaces
contrôle désormais qu'aucun nom de démonstration, aucune adresse `@siira.demo`
et aucun champ de mot de passe ne sont servis sur l'adresse de l'agent.

**D28. L'accueil de l'agent porte son propre en-tête.**
`Espace` accepte `entete="aucun"` : l'écran pose alors son bandeau de marque
d'un bord à l'autre, avec la salutation, le centre de rattachement, le numéro
connecté et trois nombres (patientes, en attente, à revoir). La barre commune,
pensée pour les écrans d'ordinateur, écrasait cette hiérarchie. L'action
principale — « Nouvelle consultation » — descend en barre fixe, à portée du
pouce : en haut de page, il fallait remonter toute la liste pour l'atteindre.

**D31. Écran d'ouverture, une fois par session, sur l'application de l'agent.**
L'agent installe Siira sur son téléphone et la démarre plusieurs fois par jour :
le temps de chargement réel — polices, feuille de style, premier rendu — se
voyait comme un écran blanc. Un rideau de marque le couvre : la marque entre,
un trait se trace sous le nom (« le chemin », sens de Siira en dioula), et il
se retire seul au bout d'1,15 s **sans jamais attendre une action**. Trois
garde-fous : il est `aria-hidden` (purement visuel, un lecteur d'écran doit
lire la page) ; il ne paraît qu'une fois par session, pas à chaque navigation ;
il ne paraît pas du tout si la personne a demandé moins d'animations. La
décision se lit par `useSyncExternalStore` et non dans un effet, pour éviter à
la fois l'écart d'hydratation et un `setState` en cascade. Les espaces
d'ordinateur n'en ont pas, et le jury ne le revoit pas à chaque onglet.

**D32. La consultation est un parcours en cinq étapes, une question à la fois.**
L'agent remplit la fiche **avec la patiente, en lui parlant**. Un formulaire
long l'oblige à chercher où il en est entre deux phrases, et à quitter la
patiente des yeux. Les cinq temps suivent l'ordre de la conversation réelle :
qui elle est, où elle habite, ce qu'elle peut payer, ce qu'elle ressent, son
accord. Chaque étape affiche un rappel de ce qui a déjà été dit, avec un lien
« Modifier » : corriger ne demande pas de refaire défiler tout le parcours. La
dernière étape récapitule tout avant l'analyse, parce que c'est le moment où
l'agent relit à voix haute avec la patiente.

**D33. Le mouvement couvre une attente ou explique un changement, jamais plus.**
Les étapes entrent en cascade (60 ms d'écart, ensemble sous 400 ms), la barre
d'avancement anime sa largeur, le rideau d'ouverture se retire en fondu. Aucun
rebond, aucune rotation, aucune animation qui retarde une saisie. Tout est
suspendu par `prefers-reduced-motion`, déjà respecté globalement.

**D34. Un libellé n'est jamais écrit deux fois à l'écran.**
Quand le titre de la question dit déjà « Son nom », le champ ne répète pas
« Nom de la patiente » au-dessus de lui : `labelMasque` le réserve aux lecteurs
d'écran. Le libellé reste donc présent dans l'arbre d'accessibilité — il n'est
pas supprimé, seulement retiré de la vue.

**D35. L'espace ONG est supprimé : les ONG financent, elles ne décident plus dans Siira.**
La plateforme n'a plus que deux espaces métier — l'agent de santé sur son
téléphone, le centre de santé ou le centre spécialisé sur ordinateur — plus
l'espace technique `admin` de l'équipe Siira. `Role` ne vaut donc plus que
`agent`, `centre` ou `admin`, les écrans `/ong`, `/ong/regles` et `/ong/impact`
sont retirés, et les comptes de démonstration ONG n'existent plus. Raison :
l'accord de prise en charge se négocie dans la réalité par téléphone, par
courrier et en réunion, pas dans une application ; prétendre le contraire
obligeait à maquetter une décision qui ne se prend pas là. Siira enregistre
donc la demande et affiche le résultat (« Financé » / « En attente »), et les
textes le disent sans détour : « Une prise en charge est enregistrée pour X.
La réponse vous sera communiquée en dehors de Siira. »

**Ce qui reste.** Les ONG demeurent les bailleurs du dispositif : un dossier
est financé par telle ONG, l'agent et le centre voient l'état du financement,
`lib/financement.ts` calcule toujours le montant et les ONG susceptibles de
couvrir le cas, et `/admin` affiche toujours leurs budgets. Seule leur
connexion disparaît, pas leur rôle.

**D36. L'envoi d'un dossier débouche sur un écran de confirmation.**
`/agent/consultation/[id]/confirmation` répond à trois questions, dans cet
ordre : est-ce parti ? quand est le rendez-vous ? qu'est-ce que je dis à la
patiente maintenant ? Avant, l'application renvoyait sans rien dire vers la
fiche de la patiente : l'agent ne savait pas si son geste avait abouti, au
moment précis où une femme vient d'obtenir un rendez-vous. L'écran affiche donc
l'accusé d'envoi, le rappel du rendez-vous et le message à lire à voix haute.

**D37. Sur l'accueil de l'agent, le nom d'une patiente a sa ligne à lui.**
À 360 px, la colonne de texte d'une carte fait 238 px. En partageant cette
largeur avec l'étiquette de niveau, le nom se coupait — « Korotimi Zoun… » —
et l'agent ne pouvait plus identifier la personne qu'il a en face de lui. Le
nom occupe donc sa propre ligne (sur deux lignes au besoin, pour un nom de
trois mots), l'étiquette de niveau rejoint l'âge et le district, et l'état du
dossier garde une ligne entière. Mesures de référence : le nom le plus long de
la démonstration demande 158 px pour 238 disponibles, et un nom de trois mots
passe sur deux lignes sans être raccourci.

**D38. La date affichée à côté de l'état d'un dossier est celle de ce dernier
mouvement.**
Elle était celle de l'inscription de la patiente, posée contre l'état du
dossier : la carte annonçait « Résultat disponible il y a 3 semaines » pour un
résultat arrivé 10 jours plus tôt. La date est désormais calculée dans
`detailPatiente()` (champ `dernier_mouvement`) : dernier suivi enregistré par
le centre, sinon l'envoi, sinon la consultation. Une date qui ne parle pas du
même événement que le mot d'à côté ment à voix basse.

**D39. Le texte d'aide est en `sable-600`, jamais en `sable-500`.**
`sable-500` mesure 4,34 pour 1 sur le fond de la feuille, sous le seuil AA de
4,5 exigé par le dossier (§11.2). Le jeton du texte d'aide est donc `sable-600`
(6,9:1), comme le documente `DESIGN.md`. Même règle pour les temps relatifs :
dans une liste étroite, `depuisCourt()` écrit « 3 j » ou « 1 sem. », ce qui
laisse la place à l'état du dossier que la date accompagne.

**D40. L'écran de connexion de l'agent ne dit plus que deux choses : où l'on
est, et quoi saisir.**
Il portait un slogan (« Le chemin vers les soins »), un paragraphe de
présentation de l'application, un titre, une phrase d'explication, une aide
sous les cases du code et deux phrases en pied de page — six blocs de texte
pour deux champs. L'agent ouvre cet écran tous les matins : chaque ligne en
plus est une ligne à lire avant de pouvoir travailler. Il reste donc le logo,
une ligne qui nomme l'espace, un titre, les deux champs, et une seule phrase de
dépannage. Le drapeau affiché dans l'indicatif disparaît au passage : le dossier
interdit les emojis (§11.2), et « +226 » se lit aussi vite. Le bloc de saisie
est centré verticalement, pour qu'une feuille vide sous le bouton ne donne pas
l'impression d'un écran inachevé.

**D41. L'accueil de l'agent ne porte plus de compteurs.**
Il affichait le numéro de téléphone de l'agent et trois cadres — patientes, en
attente, à revoir. Le numéro ne sert à rien ici : l'agent sait avec lequel il
s'est connecté. Les trois nombres comptaient ce que la liste juste en dessous
montre déjà : « 4 patientes » quand quatre cartes sont visibles, « 0 à revoir »
quand aucune carte ne porte l'alerte. La liste regagne cette hauteur : quatre
patientes tiennent à l'écran sans faire défiler, contre deux avant. Une femme
qui n'est pas venue au rendez-vous reste signalée en rouge sur sa carte, à
l'endroit où l'agent agit. Si le besoin d'un état du jour revient, une seule
ligne discrète suffira — pas trois cadres.

**D42. Après la connexion, l'agent arrive sur un accueil qui propose, et la
liste des patientes a sa propre adresse.**
L'accueil s'ouvrait directement sur la liste : un écran utile, mais qui oblige
à savoir où l'on va avant de le savoir. Il porte désormais deux grandes zones
d'appui — « Nouvelle consultation » en rose, « Mes patientes » avec le nombre
de patientes et, quand il y en a, le nombre à revoir — plus l'invitation à
installer l'application quand le navigateur la propose. La liste vit sur
`/agent/patientes`, avec l'action principale fixée en bas à portée du pouce.
Les liens « Mes patientes » des écrans de confirmation et des fiches pointent
désormais là, et non vers l'accueil. Écran de choix, puis liste, puis dossier :
une décision par écran.

**D43. Quand aucun signe inquiétant n'est relevé, Siira dit quoi surveiller,
et à quel âge.**
Le calendrier vient de l'équipe (conférence d'octobre 2026) : autopalpation
mensuelle dès 20 ans ; examen des seins par un professionnel chaque année dès
35 ans ; mammographie tous les trois ans dès 40 ans ; tous les deux ans dès
50 ans. Il est écrit dans `lib/surveillance.ts`, sous forme de phrases lisibles
à voix haute, et affiché sur l'écran de résultat d'un cas vert et sur la fiche
de la patiente — les deux endroits où la consultation ne débouche sur aucun
soin et où la seule chose utile à dire est « voilà ce que vous devez
surveiller ».

**À valider par une professionnelle de santé**, comme les règles de classement.
Pour mémoire, l'OMS (fiche « Cancer du sein », juillet 2026) situe le dépistage
par mammographie chez les femmes « généralement âgées de 50 à 69 ans » et ne
retient pas l'auto-examen comme méthode de dépistage : elle insiste sur la
connaissance des signes et la consultation sans attendre — ce que Siira fait
déjà. Le calendrier de l'équipe est donc plus proactif que la recommandation
mondiale. Il est présenté comme une invitation à surveiller, jamais comme un
diagnostic, et la mention « cet outil ne pose pas de diagnostic » reste sur
l'écran.

**D44. Le questionnaire gagne un contexte et un guide d'interrogatoire.**
Quatre réponses rejoignent la fiche, groupées sous « Contexte de la patiente » :
a-t-elle déjà eu un cancer du sein, ses règles se sont-elles arrêtées, a-t-elle
de la fièvre avec un sein chaud et rouge, est-elle enceinte ou allaite-t-elle.
Elles ne décident pas du niveau d'urgence — le classement reste dans
`lib/regles.ts` — mais elles éclairent le spécialiste et évitent de se tromper
de chemin : un sein rouge et chaud avec de la fièvre est souvent un abcès, qui
ne se soigne pas comme un cancer, et une grossesse change l'imagerie à
demander.

Sur l'étape du récit, un bloc plié « Questions à lui poser » donne à l'agent les
treize questions d'un interrogatoire du sein, dans l'ordre des champs de la
fiche. L'écran reste tenu : l'agent ouvre la liste quand il veut suivre
question par question, la referme pour dicter. La zone du récit est aussi plus
haute, et la ligne de rappel d'une étape accepte deux lignes — « Awa Compaoré,
41 ans · Saaba » s'y coupait en « … · Saa… ».

**D45. Le dépistage se rappelle au moment où l'agent saisit l'âge.**
Dès que l'âge est connu (entre 15 et 100 ans), l'étape 1 affiche ce qui est
recommandé à cet âge et invite l'agent à demander si la patiente est à jour. La
réponse se note dans la fiche (« Est-elle à jour de son dépistage ? »), dans le
groupe du contexte, et part donc avec le dossier vers le spécialiste. L'agent
n'a rien à calculer : il lit, il demande, il note — et si la patiente est en
retard, le spécialiste le voit écrit.

**D46. L'agent crée son compte lui-même : nom, prénom, statut, centre de santé,
matricule et mot de passe à 6 chiffres.**
L'écran `/inscription` demande ces six réponses, en trois groupes courts, et
signale les fautes champ par champ : un matricule déjà pris, deux mots de passe
qui diffèrent, un mot de passe qui n'a pas six chiffres. À la fin, l'agent
entre directement dans son espace — on ne demande pas de se connecter juste
après s'être inscrit. Le compte vit dans l'état de la démonstration
(`comptes`), et `lireSession()` le retrouve comme un compte de démonstration :
c'est ce qui permettra à Supabase Auth de prendre la main sans toucher aux
écrans.

Le matricule se compare en lettres et chiffres seuls : « ag 1042 » et
« AG-1042 » sont le même matricule, un tiret oublié n'ouvre pas un second
compte. Le mot de passe reste dans le navigateur, le temps de la Phase 1 ; il
n'est jamais transmis, et la vérification viendra du serveur.

**Le vocabulaire s'aligne au passage : le code à 6 chiffres s'appelle partout
« mot de passe »**, comme au centre, au lieu de « code secret » sur un écran et
« mot de passe » sur l'autre.

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

## D12 — La clé de service vit côté serveur, et on le prouve

Le client Supabase à clé de service (`src/lib/supabase/serveur.ts`) contourne
toutes les politiques RLS. Il est donc verrouillé par `import 'server-only'` :
la construction échoue si un composant client l'importe, même par une chaîne
d'imports indirecte. Les variables publiques sont isolées dans
`environnement.ts`, qui ne lit aucun secret et reste importable côté client.

Deux épreuves, parce qu'une seule ne suffit pas. `epreuve-cle-service.js`
vérifie que la clé est posée, bien formée et acceptée par le projet — mais une
clé publiable valide passe ce contrôle aussi. `epreuve-pouvoir-rls.js` tranche :
il écrit un district témoin, constate que la clé publiable est refusée (401) là
où la clé de service passe (201), puis supprime le témoin. C'est la seule preuve
du pouvoir étendu, et elle rend la base intacte.

Après tout nouvel import depuis un composant client, revérifier que ni le nom
de la variable, ni sa valeur, ni `clientDeService` n'apparaissent dans
`.next/static`.

## D13 — Les comptes réels : identifiant interne et inscription par le serveur

Supabase Auth exige un identifiant de type courriel ; l'agent, lui, ne connaît
que son matricule. On fabrique donc un courriel interne déterministe
(`ag1042@agents.siira.app`), jamais montré : « ag 1042 » et « AG-1042 » donnent
le même compte, un tiret oublié n'ouvre pas un doublon.

Deux refus de Supabase ont dicté la forme finale. Le domaine `.local` est
rejeté (`email_address_invalid`) — il faut un TLD plausible. Et `signUp` tente
d'envoyer une confirmation à une adresse derrière laquelle il n'y a aucune
boîte : au bout de quelques essais, `over_email_send_rate_limit`. L'inscription
passe donc par `/api/inscription`, qui crée le compte avec la clé de service et
`email_confirm: true` — aucun envoi. C'est le seul chemin qui ne casse pas en
série le jour de la démonstration.

Le rôle n'est jamais pris dans la requête, et le déclencheur refuse « admin »
même s'il arrive dans les métadonnées : un client écrit ce qu'il veut dans les
siennes. Les comptes d'équipe se posent par la clé de service.

`identifiants.ts` est séparé de `auth.ts` et de `serveur.ts` : la route serveur
et les écrans en ont tous deux besoin, et un module sans accès aux secrets évite
de tirer le client à clé de service dans le graphe de construction du navigateur.

## D14 — Les écrans branchés : le matricule, pas le téléphone

L'inscription enregistre le compte sur le MATRICULE. L'écran de connexion
demandait un numéro de téléphone : un compte réel aurait donc été impossible à
ouvrir, l'agent se serait inscrit puis n'aurait jamais pu revenir. La connexion
demande maintenant le matricule quand la base est configurée, et garde le
téléphone en démonstration — ce qui préserve le parcours sans réseau.

`scripts/verifier-espaces.js` asservissait « Numéro de téléphone » et « +226 » :
il refusait l'écran corrigé. Il accepte désormais l'une OU l'autre forme
d'identifiant, et exige toujours qu'il y en ait une — un écran sans identifiant
ne doit pas passer. L'indicatif n'est contrôlé que sur la forme téléphone.

Le repli sur la démonstration quand Supabase n'est pas configuré n'est pas une
commodité de développement : c'est ce qui garantit que la démonstration du jury
passe même sans réseau.
