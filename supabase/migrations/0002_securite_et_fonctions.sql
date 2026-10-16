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

NOTIFY pgrst, 'reload schema';
