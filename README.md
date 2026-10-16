# Siira

**Siira** (« le chemin » en dioula) accompagne une femme du premier contact avec
un agent de santé jusqu'à sa prise en charge par un spécialiste, avec un
financement des soins par des ONG partenaires.

Projet du Hackathon Octobre Rose 2026, Orange Digital Center Ouagadougou.

> Cet outil ne pose pas de diagnostic. Il évalue un niveau d'urgence.
> Toutes les données du dépôt sont fictives.

---

## Où en est le projet

**Phase 1 (frontend) terminée.** Tous les écrans sont navigables avec des
données fictives locales. Les règles de classement, le matching et le
financement sont réellement codés et testés. La Phase 2 (Supabase, IA DeepSeek,
temps réel serveur) attend la validation du commanditaire.

---

## Les adresses de Siira

Le même code est déployé sur plusieurs adresses Vercel. Chaque adresse déclare
son espace par la variable `NEXT_PUBLIC_ESPACE`, et n'ouvre que celui-là : les
écrans des autres espaces sont refusés, pas seulement retirés du menu.

| Adresse | Espace | Pour qui |
|---|---|---|
| <https://siira-agent.vercel.app> | `agent` | L'agent de santé, sur son téléphone. Application installable. |
| <https://siira-centre.vercel.app> | `centre` | Le centre de santé ou le centre spécialisé, sur ordinateur. |

**Deux publics, deux adresses.** Chaque partenaire reçoit un lien qui n'ouvre
que son espace : les écrans de l'autre ne sont pas seulement masqués, ils sont
refusés avant tout rendu.

**Conséquence à connaître pour une démonstration.** L'état de la démonstration
vit dans le stockage du navigateur, qui est propre à chaque adresse : l'agent
et le centre ouverts sur leurs deux adresses NE partagent PAS leurs données.
Pour montrer le parcours de bout en bout (un dossier envoyé qui apparaît chez
le centre), il faut servir l'application sans `NEXT_PUBLIC_ESPACE`, en local :
`npm run build && npm start`. Le partage des données entre les deux
adresses dédiées viendra avec Supabase (Phase 2), où l'état vivra sur le
serveur.

Le dépôt est relié à Vercel, avec `main` comme branche de production : chaque
push sur `main` met les deux adresses à jour.

---

## Installation et lancement

Il faut Node.js 20 ou plus.

```bash
npm install
npm run dev
```

L'application est servie sur <http://localhost:3000>.

| Commande | Ce qu'elle fait |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Construction pour la production |
| `npm run start` | Serveur de production |
| `npm test` | Tests unitaires des règles, du matching et du financement |
| `npm run typecheck` | Vérification des types, sans rien produire |
| `npm run lint` | Analyse du code |
| `npm run recette` | Rejoue le parcours complet dans un vrai navigateur |
| `npm run audit` | Vérifie les 10 écrans : débordements, cibles tactiles, libellés, titres |
| `npm run espaces` | Vérifie les trois adresses en local, espaces et installation compris |
| `node scripts/verifier-espaces.js --base <url> --espace agent --pwa` | Vérifie une adresse donnée |
| `./scripts/relancer.sh` | Reconstruit et relance le serveur de production sur le port 3100 |

---

### Vérifier que tout fonctionne

```bash
npm test                              # 96 tests unitaires
npm run typecheck && npm run lint     # types et style
./scripts/relancer.sh                 # construction + serveur de production
npm run audit                         # 10 écrans
node scripts/recette.js --repetitions 5
npm run espaces                       # les trois adresses, espaces et PWA
```

Dernier relevé : **96 tests unitaires**, **audit propre sur 10 écrans**,
**recette réussie**, **les trois adresses conformes en local**, et Chrome
considère l'application installable sur l'adresse de l'agent.

---

## Comptes de démonstration

**L'agent de santé se connecte avec son numéro de téléphone et son mot de passe
à 6 chiffres.** Aucun compte n'est proposé sur l'adresse de l'agent : l'écran
est celui qu'il ouvrira tous les matins. En Phase 1, tout numéro burkinabè
valide et tout mot de passe à 6 chiffres ouvrent l'espace — c'est Supabase Auth
qui vérifiera le couple en Phase 2, sans changer l'écran.

| Saisie | Règle |
|---|---|
| Numéro | 8 chiffres, indicatif `+226` fixé. **Aucun préfixe n'est refusé** : mobiles, lignes fixes et tranches récentes passent tous. |
| Mot de passe | 6 chiffres, n'importe lesquels en Phase 1. |

Seule la longueur est contrôlée, délibérément. Une liste de préfixes « connus »
écrite dans le code vieillit mal — le plan de numérotation burkinabè a changé
en 2021, les opérateurs ouvrent de nouvelles tranches sans prévenir — et finit
par bloquer de vraies personnes devant leur propre numéro. C'est le serveur qui
tranchera en Phase 2.

Un même numéro retrouve toujours le même agent de démonstration — et donc les
mêmes patientes — plutôt qu'un agent tiré au hasard à chaque connexion.
Essayez `70 12 34 56` avec le mot de passe `123456`.

**L'agent peut aussi créer son compte lui-même**, sur `/inscription` : nom,
prénom, statut (infirmier d'état, médecin généraliste, agent communautaire),
centre de santé, matricule d'agent, et mot de passe à 6 chiffres à confirmer.
Le compte est enregistré dans l'état de la démonstration, et l'agent entre
directement dans son espace — on ne lui demande pas de se connecter juste après
s'être inscrit.

Le centre et l'équipe Siira travaillent sur ordinateur et se connectent par
**numéro matricule et mot de passe** :

| Matricule saisi | Espace ouvert |
|---|---|
| `SIIRA-ADMIN` | L'équipe Siira — réinitialiser la démonstration, gérer les comptes |
| un matricule d'agent inscrit | L'espace de cet agent |
| tout autre matricule | Un centre de démonstration, attribué d'après les chiffres saisis |

En Phase 2, ces comptes auront de vrais mots de passe, qui seront notés ici et
jamais publiés.

---

## Faire la démonstration

Ouvrez **deux onglets du même navigateur** : chaque onglet garde son propre
compte, et les données sont partagées entre eux.

1. **Onglet 1 — agent** : `agent.saaba@siira.demo`
2. **Onglet 2 — centre** : le centre retenu par le matching (souvent le CHU
   Yalgado Ouédraogo pour une patiente de Saaba)

Puis, dans l'onglet de l'agent :

1. « Nouvelle consultation » → Awa Compaoré, 41 ans, district de Saaba, elle ne
   peut pas payer.
2. Dictez ou écrivez : « Elle a une boule au sein gauche depuis deux mois, ça ne
   fait pas mal, la peau est un peu tirée. »
3. Cochez le consentement, touchez « Analyser le cas » → **niveau rouge**, règles
   R1 et R5, spécialiste sous 7 jours.
4. « Continuer vers l'orientation » → centre, rendez-vous et montant proposés.
   La prise en charge est enregistrée auprès des ONG qui couvrent le cas ; la
   réponse se traite en dehors de Siira.
5. « Envoyer le dossier » → l'agent arrive sur un **écran de confirmation** :
   le dossier est parti, le rendez-vous est rappelé, et le message à lire à la
   patiente est affiché. Le dossier apparaît chez le centre en moins de
   3 secondes.
6. Onglet centre : le dossier porte l'état du financement (« Financé » ou
   « En attente »). Enregistrez « Patiente reçue », puis « Résultat
   disponible ». L'agent suit l'avancement.

Pour recommencer : espace admin → « Réinitialiser la démo ». L'espace admin
affiche aussi les budgets des ONG partenaires.

**Deux autres cas préparés** : Aminata, 34 ans, Koubri, paiement partiel
(« Elle sent une petite boule au sein droit depuis une semaine, elle bouge sous
les doigts. ») donne orange. Fatou, 28 ans, Ziniaré (« Elle a mal aux deux seins
avant ses règles chaque mois, pas de boule. ») donne vert, sans orientation.

---

## Organisation du code

```
src/
  app/
    (auth)/connexion/        connexion et comptes de démonstration
    agent/                   accueil, consultation, résultat, orientation, confirmation d'envoi, fiche patiente
    centre/                  liste, dossier, disponibilités
    admin/                   état de la démonstration, budgets des ONG, réinitialisation
    design/                  page de référence du système de design
  components/                composants d'interface réutilisables
  lib/
    regles.ts                classement du niveau d'urgence (section 6.1 du dossier)
    matching.ts              choix du centre (6.2)
    financement.ts           montant et ONG susceptibles de couvrir le cas (6.3)
    cache-demo.ts            réponses d'IA enregistrées pour la démonstration
    demo.ts                  données fictives
    data/                    couche d'accès aux données (interface + implémentation)
    session.ts               connexion simulée et redirection par rôle
scripts/
  recette.js                 parcours complet dans un vrai navigateur
  audit.js                   débordements, accessibilité, erreurs console
```

**Les trois fichiers de règles métier sont indépendants du reste.**
`lib/regles.ts` contient un tableau lisible, relisible par une professionnelle
de santé sans lire le code autour, et modifiable sans toucher aux écrans.

---

## Tests

```bash
npm test          # 96 tests : règles, matching, financement
npm run recette   # parcours complet, 29 vérifications dans un navigateur
```

La recette vérifie le scénario de la section 15 du dossier : deux espaces
ouverts en même temps, classement d'Awa en rouge, envoi du dossier, écran de
confirmation, apparition chez le centre en moins de 3 secondes, état du
financement affiché, suivi. Elle s'enchaîne cinq fois avec `--repetitions 5`.

---

## Ce qui reste à faire (Phase 2)

Supabase (tables, RLS, fonction `confirmer_financement` en transaction),
connexion réelle, routes API, intégration DeepSeek, temps réel serveur, tests
de bout en bout Playwright sur les trois adresses.

Variables d'environnement attendues : URL et clé publique Supabase, clé de
service Supabase (serveur uniquement), clé DeepSeek (serveur uniquement).
Aucune clé ne doit porter le préfixe `NEXT_PUBLIC_` hormis les deux premières.
La variable `NEXT_PUBLIC_ESPACE` (`agent` ou `centre`) désigne l'espace d'une
adresse ; vide, elle sert l'application complète, qui n'est plus déployée et
ne sert qu'en local. Une valeur d'un espace supprimé (`ong`) ferme l'adresse
au lieu de l'ouvrir en grand.

---

## Documents

- `DESIGN.md` — recherche, sources, palette, contrastes, composants
- `DECISIONS.md` — choix techniques et leurs raisons, points à valider
- `AGENTS.md` — consignes de travail sur le dépôt
