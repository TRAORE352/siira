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
| <https://siira-centre.vercel.app> | `centre` | Le centre spécialisé, sur ordinateur. |
| <https://siira-ong.vercel.app> | `ong` | L'ONG partenaire, sur ordinateur. |
| <https://siira-chi.vercel.app> | application complète | La démonstration du jury : les quatre rôles sur une seule adresse. |

**Pourquoi une quatrième adresse ?** L'état de la démonstration vit dans le
stockage du navigateur, qui est propre à chaque adresse. Sur l'application
complète, les trois espaces ouverts dans trois onglets partagent les mêmes
données : c'est le seul endroit où le parcours complet se déroule sous les yeux
du jury. Les trois adresses dédiées servent à remettre à chaque partenaire un
lien qui n'ouvre que son espace. Le partage des données entre les trois
adresses viendra avec Supabase (Phase 2), où l'état vivra sur le serveur.

Le dépôt est relié à Vercel, avec `main` comme branche de production : chaque
push sur `main` met les quatre adresses à jour.

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
| `npm run audit` | Vérifie les 13 écrans : débordements, cibles tactiles, libellés, titres |
| `npm run espaces` | Vérifie les quatre adresses en local, espaces et installation compris |
| `node scripts/verifier-espaces.js --base <url> --espace agent --pwa` | Vérifie une adresse donnée |
| `./scripts/relancer.sh` | Reconstruit et relance le serveur de production sur le port 3100 |

---

### Vérifier que tout fonctionne

```bash
npm test                              # 73 tests unitaires
npm run typecheck && npm run lint     # types et style
./scripts/relancer.sh                 # construction + serveur de production
npm run audit                         # 13 écrans
node scripts/recette.js --repetitions 5
npm run espaces                       # les quatre adresses, espaces et PWA
```

Dernier relevé : **91 tests unitaires**, **audit propre sur 13 écrans**,
**recette réussie**, **les quatre espaces conformes en local**, et Chrome
considère l'application installable sur l'adresse de l'agent.

---

## Comptes de démonstration

**L'agent de santé se connecte avec son numéro de téléphone et un code à
6 chiffres.** Aucun compte n'est proposé sur l'adresse de l'agent : l'écran est
celui qu'il ouvrira tous les matins. En Phase 1, tout numéro burkinabè valide
et tout code à 6 chiffres ouvrent l'espace — c'est Supabase Auth qui vérifiera
le couple en Phase 2, sans changer l'écran.

| Saisie | Règle |
|---|---|
| Numéro | 8 chiffres, indicatif `+226` fixé. Préfixes mobiles acceptés : `01`, `02`, `03`, `05`, `06`, `07`, et les anciens numéros en `5`, `6`, `7`. |
| Code | 6 chiffres, n'importe lesquels en Phase 1. |

Un même numéro retrouve toujours le même agent de démonstration — et donc les
mêmes patientes — plutôt qu'un agent tiré au hasard à chaque connexion.
Essayez `70 12 34 56` avec le code `123456`.

Les autres espaces travaillent sur ordinateur et gardent la connexion par
compte, car l'adresse de démonstration doit ouvrir les quatre rôles côte à
côte. Sur l'écran de connexion, il suffit de toucher un compte.

| Rôle | Adresse | Personne |
|---|---|---|
| Centre | `centre.bogodogo@siira.demo` | Dr Alimata Zongo, CHU de Bogodogo |
| Centre | `centre.tengandogo@siira.demo` | Dr Issa Compaoré, CHU de Tengandogo |
| Centre | `centre.yalgado@siira.demo` | Dr Rasmata Nikiéma, CHU Yalgado Ouédraogo |
| Centre | `centre.ziniare@siira.demo` | Dr Paul Ilboudo, CHR de Ziniaré |
| ONG | `ong.yennenga@siira.demo` | Clarisse Tapsoba, Fonds Yennenga |
| ONG | `ong.wendpanga@siira.demo` | Hamidou Barry, Alliance Wendpanga |
| Admin | `admin@siira.demo` | Équipe Siira |

Les trois agents de démonstration (Salimata Ouédraogo à Saaba, Boukary
Sawadogo à Ziniaré, Mariam Kaboré à Koubri) restent accessibles par leur
adresse sur l'adresse de démonstration complète.

En Phase 2, ces comptes auront de vrais mots de passe, qui seront notés ici et
jamais publiés.

---

## Faire la démonstration

Ouvrez **trois onglets du même navigateur** : chaque onglet garde son propre
compte, et les données sont partagées entre eux.

1. **Onglet 1 — agent** : `agent.saaba@siira.demo`
2. **Onglet 2 — centre** : le centre retenu par le matching (souvent le CHU
   Yalgado Ouédraogo pour une patiente de Saaba)
3. **Onglet 3 — ONG** : `ong.yennenga@siira.demo`

Puis, dans l'onglet de l'agent :

1. « Nouvelle consultation » → Awa Compaoré, 41 ans, district de Saaba, elle ne
   peut pas payer.
2. Dictez ou écrivez : « Elle a une boule au sein gauche depuis deux mois, ça ne
   fait pas mal, la peau est un peu tirée. »
3. Cochez le consentement, touchez « Analyser le cas » → **niveau rouge**, règles
   R1 et R5, spécialiste sous 7 jours.
4. « Continuer vers l'orientation » → centre, rendez-vous et montant proposés.
5. « Envoyer le dossier » → il apparaît chez le centre en moins de 3 secondes.
6. Onglet ONG : la demande est là, **sans aucune donnée d'identité**. « Je
   finance » → le budget baisse, l'agent voit le financement confirmé.
7. Onglet centre : enregistrez « Patiente reçue », puis « Résultat disponible ».
   L'agent et le tableau d'impact suivent.

Pour recommencer : espace admin → « Réinitialiser la démo ».

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
    agent/                   accueil, consultation, résultat, orientation, fiche patiente
    centre/                  liste, dossier, disponibilités
    ong/                     demandes, règles, impact
    admin/                   état de la démonstration et réinitialisation
    design/                  page de référence du système de design
  components/                composants d'interface réutilisables
  lib/
    regles.ts                classement du niveau d'urgence (section 6.1 du dossier)
    matching.ts              choix du centre (6.2)
    financement.ts           montant et correspondance avec les ONG (6.3)
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
npm test          # 53 tests : règles, matching, financement
npm run recette   # parcours complet, 34 vérifications dans un navigateur
```

La recette vérifie le scénario de la section 15 du dossier : trois rôles ouverts
en même temps, classement d'Awa en rouge, envoi du dossier, apparition chez le
centre en moins de 3 secondes, demande anonyme chez l'ONG, financement, suivi,
tableau d'impact. Elle s'enchaîne cinq fois avec `--repetitions 5`.

---

## Ce qui reste à faire (Phase 2)

Supabase (tables, RLS, fonction `confirmer_financement` en transaction),
connexion réelle, routes API, intégration DeepSeek, temps réel serveur, tests
de bout en bout Playwright sur les quatre adresses.

Variables d'environnement attendues : URL et clé publique Supabase, clé de
service Supabase (serveur uniquement), clé DeepSeek (serveur uniquement).
Aucune clé ne doit porter le préfixe `NEXT_PUBLIC_` hormis les deux premières.
La variable `NEXT_PUBLIC_ESPACE` (`agent`, `centre` ou `ong`) désigne l'espace
d'une adresse ; vide, elle sert l'application complète.

---

## Documents

- `DESIGN.md` — recherche, sources, palette, contrastes, composants
- `DECISIONS.md` — choix techniques et leurs raisons, points à valider
- `AGENTS.md` — consignes de travail sur le dépôt
