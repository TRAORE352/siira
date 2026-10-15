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

**En ligne :** <https://siira-chi.vercel.app>

Le dépôt est relié à Vercel, avec `main` comme branche de production : chaque
push sur `main` met la production à jour. Siira peut donc être montrée depuis
n'importe quel téléphone ou ordinateur, sans installation.

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
| `./scripts/relancer.sh` | Reconstruit et relance le serveur de production sur le port 3100 |

---

### Vérifier que tout fonctionne

```bash
npm test                              # 53 tests unitaires
npm run typecheck && npm run lint     # types et style
./scripts/relancer.sh                 # construction + serveur de production
npm run audit                         # 13 écrans
node scripts/recette.js --repetitions 5
```

Dernier relevé : **53 tests unitaires**, **audit propre sur 13 écrans**,
**recette réussie 5 fois de suite (170 vérifications)**.

---

## Comptes de démonstration

La connexion est simulée en Phase 1 : sur l'écran de connexion, il suffit de
toucher un compte pour ouvrir son espace. Les adresses ci-dessous fonctionnent
aussi dans le formulaire, avec n'importe quel mot de passe.

| Rôle | Adresse | Personne |
|---|---|---|
| Agent | `agent.saaba@siira.demo` | Salimata Ouédraogo, centre de santé de Saaba |
| Agent | `agent.ziniare@siira.demo` | Boukary Sawadogo, centre de santé de Ziniaré |
| Agent | `agent.koubri@siira.demo` | Mariam Kaboré, centre de santé de Koubri |
| Centre | `centre.bogodogo@siira.demo` | Dr Alimata Zongo, CHU de Bogodogo |
| Centre | `centre.tengandogo@siira.demo` | Dr Issa Compaoré, CHU de Tengandogo |
| Centre | `centre.yalgado@siira.demo` | Dr Rasmata Nikiéma, CHU Yalgado Ouédraogo |
| Centre | `centre.ziniare@siira.demo` | Dr Paul Ilboudo, CHR de Ziniaré |
| ONG | `ong.yennenga@siira.demo` | Clarisse Tapsoba, Fonds Yennenga |
| ONG | `ong.wendpanga@siira.demo` | Hamidou Barry, Alliance Wendpanga |
| Admin | `admin@siira.demo` | Équipe Siira |

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
de bout en bout Playwright, déploiement Vercel.

Variables d'environnement attendues : URL et clé publique Supabase, clé de
service Supabase (serveur uniquement), clé DeepSeek (serveur uniquement).
Aucune clé ne doit porter le préfixe `NEXT_PUBLIC_` hormis les deux premières.

---

## Documents

- `DESIGN.md` — recherche, sources, palette, contrastes, composants
- `DECISIONS.md` — choix techniques et leurs raisons, points à valider
- `AGENTS.md` — consignes de travail sur le dépôt
