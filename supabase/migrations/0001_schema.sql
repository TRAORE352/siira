-- ====================================================================
-- Siira — schéma
--
-- Ce que la base porte elle-même, et que l'application n'avait pas à
-- garantir en Phase 1 : les statuts et leurs transitions, le consentement
-- de la patiente, un seul financement confirmé par dossier, un budget qui
-- ne passe jamais sous zéro.
--
-- Conventions :
--   * les listes fermées sont des colonnes texte avec contrainte CHECK,
--     pour rester lisibles et modifiables sans migration de type ;
--   * tout identifiant est un uuid, tout enregistrement porte `cree_le`.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------
-- Référentiels
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.districts (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom       text NOT NULL UNIQUE,
  latitude  double precision NOT NULL,
  longitude double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS public.centres (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom            text NOT NULL,
  service        text NOT NULL DEFAULT '',
  latitude       double precision NOT NULL,
  longitude      double precision NOT NULL,
  examens        text[] NOT NULL DEFAULT '{}',
  places_semaine integer NOT NULL DEFAULT 0 CHECK (places_semaine >= 0),
  actif          boolean NOT NULL DEFAULT true,
  CONSTRAINT centres_examens_connus CHECK (
    examens <@ ARRAY['echographie', 'mammographie', 'biopsie']::text[]
  )
);

CREATE TABLE IF NOT EXISTS public.creneaux (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  debut     timestamptz NOT NULL,
  libre     boolean NOT NULL DEFAULT true,
  cree_le   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creneaux_centre_libre ON public.creneaux (centre_id, debut) WHERE libre;

CREATE TABLE IF NOT EXISTS public.tarifs (
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  soin      text NOT NULL CHECK (soin IN ('consultation', 'echographie', 'biopsie', 'transport')),
  montant   integer NOT NULL CHECK (montant >= 0),
  PRIMARY KEY (centre_id, soin)
);

CREATE TABLE IF NOT EXISTS public.ongs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom            text NOT NULL,
  budget_total   integer NOT NULL CHECK (budget_total >= 0),
  budget_restant integer NOT NULL CHECK (budget_restant >= 0),
  cree_le        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ongs_budget_coherent CHECK (budget_restant <= budget_total)
);

CREATE TABLE IF NOT EXISTS public.regles_financement (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ong_id     uuid NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  districts  uuid[] NOT NULL DEFAULT '{}',
  niveaux    text[] NOT NULL DEFAULT '{}',
  situations text[] NOT NULL DEFAULT '{}',
  active     boolean NOT NULL DEFAULT true,
  cree_le    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regles_niveaux_connus CHECK (
    niveaux <@ ARRAY['vert', 'orange', 'rouge']::text[]
  ),
  CONSTRAINT regles_situations_connues CHECK (
    situations <@ ARRAY['peut_payer', 'partielle', 'ne_peut_pas']::text[]
  )
);

-- --------------------------------------------------------------------
-- Comptes
--
-- L'identifiant du profil EST l'utilisateur Supabase Auth. Le matricule
-- est l'identité de connexion des deux espaces d'ordinateur ; un agent se
-- connecte par son téléphone, et son profil porte les deux.
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profils (
  id           uuid PRIMARY KEY,
  nom          text NOT NULL,
  prenoms      text,
  sexe         text CHECK (sexe IN ('femme', 'homme')),
  specialite   text,
  telephone    text,
  email        text,
  role         text NOT NULL CHECK (role IN ('agent', 'centre', 'admin')),
  statut       text CHECK (statut IN ('infirmier_etat', 'medecin_generaliste', 'agent_communautaire')),
  matricule    text UNIQUE,
  centre_sante text,
  centre_id    uuid REFERENCES public.centres(id) ON DELETE SET NULL,
  cree_le      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profils_centre_coherent CHECK (role <> 'centre' OR centre_id IS NOT NULL)
);

-- Le matricule se compare sans casse ni séparateurs : « ag 1042 » et
-- « AG-1042 » sont le même agent.
CREATE UNIQUE INDEX IF NOT EXISTS profils_matricule_cle
  ON public.profils (upper(regexp_replace(matricule, '[^A-Za-z0-9]', '', 'g')))
  WHERE matricule IS NOT NULL;

-- --------------------------------------------------------------------
-- Parcours de soins
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patientes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  agent_id          uuid NOT NULL REFERENCES public.profils(id) ON DELETE RESTRICT,
  nom               text NOT NULL,
  age               integer NOT NULL CHECK (age BETWEEN 15 AND 100),
  district_id       uuid NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  village           text,
  telephone         text,
  capacite_paiement text NOT NULL CHECK (capacite_paiement IN ('peut_payer', 'partielle', 'ne_peut_pas')),
  consentement      boolean NOT NULL DEFAULT false,
  cree_le           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patientes_agent ON public.patientes (agent_id, cree_le DESC);

CREATE TABLE IF NOT EXISTS public.consultations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patiente_id             uuid NOT NULL REFERENCES public.patientes(id) ON DELETE CASCADE,
  agent_id                uuid NOT NULL REFERENCES public.profils(id) ON DELETE RESTRICT,
  recit                   text NOT NULL CHECK (char_length(recit) BETWEEN 20 AND 2000),
  fiche                   jsonb,
  niveau_propose          text CHECK (niveau_propose IN ('vert', 'orange', 'rouge')),
  regles_declenchees      text[] NOT NULL DEFAULT '{}',
  explication             text,
  niveau_valide           text CHECK (niveau_valide IN ('vert', 'orange', 'rouge')),
  raison_correction       text,
  commentaire_correction  text,
  statut                  text NOT NULL DEFAULT 'brouillon'
                            CHECK (statut IN ('brouillon', 'analysee', 'validee', 'close')),
  cree_le                 timestamptz NOT NULL DEFAULT now(),
  -- Une correction porte toujours sa raison : c'est la règle du dossier.
  CONSTRAINT consultations_correction_motivee CHECK (
    niveau_valide IS NULL OR niveau_valide = niveau_propose OR raison_correction IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS consultations_patiente ON public.consultations (patiente_id, cree_le DESC);
CREATE INDEX IF NOT EXISTS consultations_agent ON public.consultations (agent_id, cree_le DESC);

CREATE TABLE IF NOT EXISTS public.orientations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL UNIQUE REFERENCES public.consultations(id) ON DELETE CASCADE,
  centre_id       uuid NOT NULL REFERENCES public.centres(id) ON DELETE RESTRICT,
  creneau_id      uuid REFERENCES public.creneaux(id) ON DELETE SET NULL,
  score           numeric(5, 2) NOT NULL DEFAULT 0,
  resume_ia       text,
  statut          text NOT NULL DEFAULT 'brouillon'
                    CHECK (statut IN ('brouillon', 'envoyee', 'recue', 'examens', 'resultat', 'close', 'absente')),
  envoyee_le      timestamptz,
  cree_le         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orientations_centre ON public.orientations (centre_id, statut);

CREATE TABLE IF NOT EXISTS public.financements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orientation_id uuid NOT NULL REFERENCES public.orientations(id) ON DELETE CASCADE,
  ong_id         uuid NOT NULL REFERENCES public.ongs(id) ON DELETE RESTRICT,
  montant        integer NOT NULL CHECK (montant >= 0),
  statut         text NOT NULL DEFAULT 'proposee'
                   CHECK (statut IN ('proposee', 'confirmee', 'refusee', 'retiree')),
  raison_refus   text,
  cree_le        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orientation_id, ong_id)
);

/*
 * Un seul financement confirmé par dossier — l'index partiel le garantit,
 * et c'est lui qui rend la fonction d'accord réellement atomique : à deux
 * acceptations simultanées, la seconde viole l'index au lieu de passer.
 */
CREATE UNIQUE INDEX IF NOT EXISTS financements_un_seul_confirme
  ON public.financements (orientation_id) WHERE statut = 'confirmee';

CREATE TABLE IF NOT EXISTS public.suivis (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orientation_id uuid NOT NULL REFERENCES public.orientations(id) ON DELETE CASCADE,
  etape          text NOT NULL CHECK (etape IN ('recue', 'examens', 'resultat', 'absente')),
  resultat       text NOT NULL DEFAULT 'en_attente'
                   CHECK (resultat IN ('en_attente', 'benin', 'a_surveiller', 'cancer_confirme')),
  note           text,
  auteur_id      uuid NOT NULL REFERENCES public.profils(id) ON DELETE RESTRICT,
  cree_le        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS suivis_orientation ON public.suivis (orientation_id, cree_le);

-- Le résultat ne se saisit qu'avec l'étape « résultat ».
ALTER TABLE public.suivis DROP CONSTRAINT IF EXISTS suivis_resultat_coherent;
ALTER TABLE public.suivis ADD CONSTRAINT suivis_resultat_coherent CHECK (
  resultat = 'en_attente' OR etape = 'resultat'
);

-- --------------------------------------------------------------------
-- Journal du dossier : ce que la démonstration remet à zéro
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.journal (
  id       bigserial PRIMARY KEY,
  table_nom text NOT NULL,
  action   text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  lignes_id text[] NOT NULL DEFAULT '{}',
  auteur   uuid,
  cree_le  timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- Vue de lecture pour le centre : un dossier, tout ce qu'il faut voir
-- --------------------------------------------------------------------

CREATE OR REPLACE VIEW public.dossiers_centre
WITH (security_invoker = true) AS
SELECT
  o.id                AS orientation_id,
  o.statut            AS statut_orientation,
  o.centre_id,
  o.score,
  o.resume_ia,
  o.envoyee_le,
  c.id                AS consultation_id,
  c.niveau_propose,
  c.niveau_valide,
  c.regles_declenchees,
  c.raison_correction,
  c.fiche,
  p.id                AS patiente_id,
  p.nom               AS patiente_nom,
  p.age,
  p.telephone,
  p.capacite_paiement,
  d.nom               AS district,
  f.nom               AS financeur,
  fi.montant          AS montant_finance,
  fi.statut           AS statut_financement,
  cr.debut            AS rendez_vous
FROM public.orientations o
JOIN public.consultations c ON c.id = o.consultation_id
JOIN public.patientes p ON p.id = c.patiente_id
JOIN public.districts d ON d.id = p.district_id
LEFT JOIN public.creneaux cr ON cr.id = o.creneau_id
LEFT JOIN public.financements fi
  ON fi.orientation_id = o.id AND fi.statut = 'confirmee'
LEFT JOIN public.ongs f ON f.id = fi.ong_id;

/*
 * Pas de vue `cas_anonymes` : elle servait aux ONG, qui ne se connectent
 * plus depuis la décision D35. Les financeurs sont des bailleurs, leur
 * accord se saisit côté équipe.
 */
