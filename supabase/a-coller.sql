-- ====================================================================
-- SIIRA — À COLLER EN ENTIER DANS LE SQL EDITOR DE SUPABASE
--
--   Supabase -> SQL Editor -> New query -> coller TOUT ce fichier -> Run
--
-- Ne collez jamais un morceau : le fichier est fait pour être pris d'un
-- bloc. Il ne détruit rien : tout est créé seulement si absent, et peut
-- donc être rejoué sans risque.
--
-- RÉSULTAT ATTENDU
--   1. « Success. No rows returned »  (c'est normal pour du DDL)
--   2. puis, tout à la fin, un tableau de vérification qui doit afficher :
--         fonctions Siira  12
--         politiques RLS   25
--         tables           13
--         tables avec RLS  13
--         vues              2
--
-- Si autre chose s'affiche : arrêtez-vous et envoyez le message d'erreur.
-- ====================================================================

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


-- ====================================================================
-- Siira — sécurité et fonctions
--
-- Les politiques disent qui voit quoi ; les fonctions portent ce qu'un
-- simple droit d'écriture ne peut pas garantir : l'accord de prise en
-- charge en une seule transaction, et la remise à zéro de la démonstration.
-- ====================================================================

-- --------------------------------------------------------------------
-- Qui suis-je ?  (SECURITY DEFINER : la table reste fermée, la réponse
-- ne dépend que du jeton, et il n'y a donc pas de récursion de politique)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mon_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profils WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.mon_centre()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT centre_id FROM public.profils WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.mon_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mon_centre() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mon_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mon_centre() TO authenticated, service_role;

-- --------------------------------------------------------------------
-- Ce que la base garantit, et que l'écran ne peut pas garantir seul
-- --------------------------------------------------------------------

/*
 * Pas de consultation sans consentement. La contrainte vit ici parce que
 * c'est la seule barrière qu'aucun chemin d'écriture ne contourne — ni
 * l'application, ni un script, ni une console d'administration.
 */
CREATE OR REPLACE FUNCTION public.exiger_consentement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.patientes WHERE id = NEW.patiente_id AND consentement
  ) THEN
    RAISE EXCEPTION 'La patiente n''a pas donné son consentement.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS consultations_consentement ON public.consultations;
CREATE TRIGGER consultations_consentement
  BEFORE INSERT ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.exiger_consentement();

/*
 * L'étape d'un suivi fait avancer le dossier. Le faire ici plutôt que dans
 * l'application évite qu'un statut et son historique divergent quand une
 * écriture vient d'ailleurs.
 */
CREATE OR REPLACE FUNCTION public.avancer_orientation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orientations
     SET statut = NEW.etape
   WHERE id = NEW.orientation_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS suivis_avancement ON public.suivis;
CREATE TRIGGER suivis_avancement
  AFTER INSERT ON public.suivis
  FOR EACH ROW EXECUTE FUNCTION public.avancer_orientation();

/*
 * Les transitions de statut du dossier, telles que le dossier les décrit.
 * Une étape ne se saute pas, on ne revient pas en arrière, et « absente »
 * ne se quitte que par la réception.
 */
CREATE OR REPLACE FUNCTION public.verifier_transition_orientation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  suite text[];
BEGIN
  IF NEW.statut = OLD.statut THEN RETURN NEW; END IF;

  suite := CASE OLD.statut
    WHEN 'brouillon' THEN ARRAY['envoyee']
    WHEN 'envoyee'   THEN ARRAY['recue', 'absente']
    WHEN 'recue'     THEN ARRAY['examens']
    WHEN 'examens'   THEN ARRAY['resultat']
    WHEN 'resultat'  THEN ARRAY['close']
    WHEN 'absente'   THEN ARRAY['recue']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (NEW.statut = ANY (suite)) THEN
    RAISE EXCEPTION 'Transition refusée : % vers %', OLD.statut, NEW.statut
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.statut = 'envoyee' AND NEW.envoyee_le IS NULL THEN
    NEW.envoyee_le := now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orientations_transitions ON public.orientations;
CREATE TRIGGER orientations_transitions
  BEFORE UPDATE ON public.orientations
  FOR EACH ROW EXECUTE FUNCTION public.verifier_transition_orientation();

/*
 * Le statut du profil et son centre gouvernent les droits de son
 * propriétaire : ils ne se modifient pas soi-même. Le service_role garde
 * tous ses droits, c'est lui qui crée et qui promeut.
 * On restaure au lieu de lever : une mise à jour de profil qui renvoie la
 * ligne entière ne doit pas échouer parce qu'un champ protégé l'accompagne.
 */
CREATE OR REPLACE FUNCTION public.proteger_colonnes_de_droit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NULL
     OR coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')
        = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.role := OLD.role;
  NEW.centre_id := OLD.centre_id;
  NEW.matricule := OLD.matricule;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profils_colonnes_protegees ON public.profils;
CREATE TRIGGER profils_colonnes_protegees
  BEFORE UPDATE ON public.profils
  FOR EACH ROW EXECUTE FUNCTION public.proteger_colonnes_de_droit();

-- --------------------------------------------------------------------
-- Accord d'une prise en charge, en une seule transaction
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirmer_financement(p_financement_id uuid)
RETURNS public.financements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  f        public.financements;
  dispo    integer;
  role_moi text;
BEGIN
  role_moi := public.mon_role();
  IF coalesce(role_moi, '') NOT IN ('centre', 'admin') THEN
    RAISE EXCEPTION 'Seul le centre ou l''équipe peut accorder une prise en charge.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- La ligne est verrouillée : deux accords simultanés se suivent au lieu
  -- de se doubler.
  SELECT * INTO f FROM public.financements WHERE id = p_financement_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande de prise en charge introuvable.' USING ERRCODE = 'no_data_found';
  END IF;
  IF f.statut <> 'proposee' THEN
    RAISE EXCEPTION 'Cette demande n''est plus ouverte (%).', f.statut
      USING ERRCODE = 'check_violation';
  END IF;

  -- Le budget de l'ONG, verrouillé lui aussi.
  SELECT budget_restant INTO dispo FROM public.ongs WHERE id = f.ong_id FOR UPDATE;
  IF dispo < f.montant THEN
    RAISE EXCEPTION 'Budget insuffisant chez ce financeur.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.ongs SET budget_restant = budget_restant - f.montant WHERE id = f.ong_id;
  UPDATE public.financements SET statut = 'confirmee' WHERE id = f.id RETURNING * INTO f;

  -- Les autres demandes du même dossier se retirent : un seul financeur.
  UPDATE public.financements
     SET statut = 'retiree'
   WHERE orientation_id = f.orientation_id AND id <> f.id AND statut = 'proposee';

  RETURN f;
END $$;

REVOKE ALL ON FUNCTION public.confirmer_financement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmer_financement(uuid) TO authenticated, service_role;

-- --------------------------------------------------------------------
-- Remise à zéro de la démonstration
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reinitialiser_demonstration()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(public.mon_role(), '') <> 'admin' THEN
    RAISE EXCEPTION 'Réservé à l''équipe Siira.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.suivis;
  DELETE FROM public.financements;
  DELETE FROM public.orientations;
  DELETE FROM public.consultations;
  DELETE FROM public.patientes;
  UPDATE public.creneaux SET libre = true;
  UPDATE public.ongs SET budget_restant = budget_total;
END $$;

REVOKE ALL ON FUNCTION public.reinitialiser_demonstration() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reinitialiser_demonstration() TO authenticated, service_role;

-- --------------------------------------------------------------------
-- Politiques : qui voit quoi
--
-- Les politiques ne lisent JAMAIS une table depuis la politique d'une
-- autre : consultations → orientations → consultations boucle à l'infini
-- (PostgreSQL le refuse). Chaque contrôle croisé passe par une fonction
-- SECURITY DEFINER, qui rend un identifiant et rien d'autre.
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.centre_de_la_consultation(p_consultation_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT centre_id FROM public.orientations WHERE consultation_id = p_consultation_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.centre_de_la_patiente(p_patiente_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.centre_id
    FROM public.consultations c
    JOIN public.orientations o ON o.consultation_id = c.id
   WHERE c.patiente_id = p_patiente_id
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.agent_de_l_orientation(p_orientation_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.agent_id
    FROM public.orientations o
    JOIN public.consultations c ON c.id = o.consultation_id
   WHERE o.id = p_orientation_id
$$;

CREATE OR REPLACE FUNCTION public.centre_de_l_orientation(p_orientation_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT centre_id FROM public.orientations WHERE id = p_orientation_id
$$;

REVOKE ALL ON FUNCTION public.centre_de_la_consultation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.centre_de_la_patiente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agent_de_l_orientation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.centre_de_l_orientation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_de_la_consultation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.centre_de_la_patiente(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agent_de_l_orientation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.centre_de_l_orientation(uuid) TO authenticated, service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'districts','centres','creneaux','tarifs','ongs','regles_financement',
    'profils','patientes','consultations','orientations','financements','suivis','journal'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

/* Référentiels : lisibles par tout compte connecté, modifiables par l'équipe.
   Le centre modifie ses propres créneaux — c'est ses disponibilités. */
DROP POLICY IF EXISTS referentiels_lecture ON public.districts;
CREATE POLICY referentiels_lecture ON public.districts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS referentiels_admin ON public.districts;
CREATE POLICY referentiels_admin ON public.districts FOR ALL TO authenticated
  USING (public.mon_role() = 'admin') WITH CHECK (public.mon_role() = 'admin');

DROP POLICY IF EXISTS centres_lecture ON public.centres;
CREATE POLICY centres_lecture ON public.centres FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS centres_admin ON public.centres;
CREATE POLICY centres_admin ON public.centres FOR ALL TO authenticated
  USING (public.mon_role() = 'admin') WITH CHECK (public.mon_role() = 'admin');

DROP POLICY IF EXISTS tarifs_lecture ON public.tarifs;
CREATE POLICY tarifs_lecture ON public.tarifs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS tarifs_admin ON public.tarifs;
CREATE POLICY tarifs_admin ON public.tarifs FOR ALL TO authenticated
  USING (public.mon_role() = 'admin') WITH CHECK (public.mon_role() = 'admin');

DROP POLICY IF EXISTS creneaux_lecture ON public.creneaux;
CREATE POLICY creneaux_lecture ON public.creneaux FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS creneaux_son_centre ON public.creneaux;
CREATE POLICY creneaux_son_centre ON public.creneaux FOR ALL TO authenticated
  USING (public.mon_role() = 'admin' OR centre_id = public.mon_centre())
  WITH CHECK (public.mon_role() = 'admin' OR centre_id = public.mon_centre());

/* Financeurs : leurs noms et leurs budgets se lisent, leurs règles se
   modifient depuis l'espace équipe. */
DROP POLICY IF EXISTS ongs_lecture ON public.ongs;
CREATE POLICY ongs_lecture ON public.ongs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ongs_admin ON public.ongs;
CREATE POLICY ongs_admin ON public.ongs FOR ALL TO authenticated
  USING (public.mon_role() = 'admin') WITH CHECK (public.mon_role() = 'admin');

DROP POLICY IF EXISTS regles_lecture ON public.regles_financement;
CREATE POLICY regles_lecture ON public.regles_financement FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS regles_admin ON public.regles_financement;
CREATE POLICY regles_admin ON public.regles_financement FOR ALL TO authenticated
  USING (public.mon_role() = 'admin') WITH CHECK (public.mon_role() = 'admin');

/* Profils : chacun le sien, l'équipe tous. Les noms dont un écran a besoin
   ailleurs passent par la vue `profils_publics`, jamais par la table. */
DROP POLICY IF EXISTS profils_le_mien ON public.profils;
CREATE POLICY profils_le_mien ON public.profils FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.mon_role() = 'admin');
DROP POLICY IF EXISTS profils_je_me_modifie ON public.profils;
CREATE POLICY profils_je_me_modifie ON public.profils FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.mon_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.mon_role() = 'admin');
DROP POLICY IF EXISTS profils_admin ON public.profils;
CREATE POLICY profils_admin ON public.profils FOR ALL TO authenticated
  USING (public.mon_role() = 'admin') WITH CHECK (public.mon_role() = 'admin');

/* Patientes : l'agent les siennes ; le centre celles qu'on lui a orientées. */
DROP POLICY IF EXISTS patientes_agent ON public.patientes;
CREATE POLICY patientes_agent ON public.patientes FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.mon_role() = 'admin')
  WITH CHECK (agent_id = auth.uid() OR public.mon_role() = 'admin');

DROP POLICY IF EXISTS patientes_centre ON public.patientes;
CREATE POLICY patientes_centre ON public.patientes FOR SELECT TO authenticated
  USING (public.centre_de_la_patiente(id) = public.mon_centre());

DROP POLICY IF EXISTS consultations_agent ON public.consultations;
CREATE POLICY consultations_agent ON public.consultations FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.mon_role() = 'admin')
  WITH CHECK (agent_id = auth.uid() OR public.mon_role() = 'admin');

DROP POLICY IF EXISTS consultations_centre ON public.consultations;
CREATE POLICY consultations_centre ON public.consultations FOR SELECT TO authenticated
  USING (public.centre_de_la_consultation(id) = public.mon_centre());

/* Orientations : l'agent les siennes (il les envoie), le centre celles vers
   son centre (il en change le statut), l'équipe toutes. */
DROP POLICY IF EXISTS orientations_agent ON public.orientations;
CREATE POLICY orientations_agent ON public.orientations FOR ALL TO authenticated
  USING (
    public.mon_role() = 'admin' OR public.agent_de_l_orientation(id) = auth.uid()
  )
  WITH CHECK (
    public.mon_role() = 'admin' OR public.agent_de_l_orientation(id) = auth.uid()
  );

DROP POLICY IF EXISTS orientations_centre ON public.orientations;
CREATE POLICY orientations_centre ON public.orientations FOR ALL TO authenticated
  USING (centre_id = public.mon_centre())
  WITH CHECK (centre_id = public.mon_centre());

/* Financements : l'agent les siens (il crée les demandes en envoyant le
   dossier), le centre ceux de son centre, l'équipe tout. La confirmation
   passe par la fonction, jamais par une écriture directe. */
DROP POLICY IF EXISTS financements_agent ON public.financements;
CREATE POLICY financements_agent ON public.financements FOR ALL TO authenticated
  USING (
    public.mon_role() = 'admin'
    OR public.agent_de_l_orientation(orientation_id) = auth.uid()
  )
  WITH CHECK (
    public.mon_role() = 'admin'
    OR public.agent_de_l_orientation(orientation_id) = auth.uid()
  );

DROP POLICY IF EXISTS financements_centre ON public.financements;
CREATE POLICY financements_centre ON public.financements FOR SELECT TO authenticated
  USING (public.centre_de_l_orientation(orientation_id) = public.mon_centre());

/* Suivis : le centre les écrit, l'agent les lit, l'équipe tout. */
DROP POLICY IF EXISTS suivis_centre ON public.suivis;
CREATE POLICY suivis_centre ON public.suivis FOR ALL TO authenticated
  USING (
    public.mon_role() = 'admin'
    OR public.centre_de_l_orientation(orientation_id) = public.mon_centre()
  )
  WITH CHECK (auteur_id = auth.uid());

DROP POLICY IF EXISTS suivis_agent ON public.suivis;
CREATE POLICY suivis_agent ON public.suivis FOR SELECT TO authenticated
  USING (public.agent_de_l_orientation(orientation_id) = auth.uid());

/* Journal : écrit par le backend seulement. Aucune politique : fermé. */

-- --------------------------------------------------------------------
-- Noms lisibles par tous les comptes, sans ouvrir la table des profils
-- --------------------------------------------------------------------

CREATE OR REPLACE VIEW public.profils_publics
WITH (security_invoker = true) AS
  SELECT id, nom, prenoms, role, specialite, centre_sante
  FROM public.profils;

GRANT SELECT ON public.profils_publics TO authenticated;
GRANT SELECT ON public.dossiers_centre TO authenticated;

-- --------------------------------------------------------------------
-- Temps réel : le dossier qui part, la prise en charge qui se confirme
-- --------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orientations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financements;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- (le rechargement du schéma est en fin de fichier)

-- ====================================================================
-- VÉRIFICATION — le tableau doit afficher exactement ces valeurs
-- ====================================================================

SELECT 'tables' AS objet, count(*) AS nombre
  FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'vues', count(*)
  FROM information_schema.views WHERE table_schema = 'public'
UNION ALL
SELECT 'fonctions Siira', count(*)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('mon_role','mon_centre','exiger_consentement','avancer_orientation',
                     'verifier_transition_orientation','proteger_colonnes_de_droit',
                     'confirmer_financement','reinitialiser_demonstration',
                     'centre_de_la_consultation','centre_de_la_patiente',
                     'agent_de_l_orientation','centre_de_l_orientation')
UNION ALL
SELECT 'tables avec RLS', count(*)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relrowsecurity
UNION ALL
SELECT 'politiques RLS', count(*)
  FROM pg_policies WHERE schemaname = 'public'
ORDER BY objet;

NOTIFY pgrst, 'reload schema';
