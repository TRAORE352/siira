-- ====================================================================
-- SIIRA — ÉTAPE 2 : LES COMPTES RÉELS
--   À COLLER EN ENTIER DANS LE SQL EDITOR DE SUPABASE
--
--   Supabase -> SQL Editor -> New query -> coller TOUT ce fichier -> Run
--
-- À passer APRÈS `a-coller.sql` (le schéma et la sécurité).
-- Il ne détruit rien, et peut être rejoué sans risque.
--
-- CE QUE ÇA CHANGE
--   Aujourd'hui, créer un compte dans Supabase Auth ne crée AUCUN profil.
--   Comme toutes les politiques RLS reposent sur `mon_role()`, qui lit la
--   table `profils`, un compte sans profil ne peut rien lire ni écrire :
--   l'agent s'inscrit, se connecte, et son écran reste vide SANS la moindre
--   erreur visible. Ce fichier pose le déclencheur qui crée le profil à
--   l'instant où le compte naît.
--
-- RÉSULTAT ATTENDU
--   1. « Success. No rows returned »
--   2. puis un tableau de vérification affichant :
--         1. profils rattache a auth.users   oui
--         2. declencheur d inscription       oui
--         3. fonction matricule_est_libre    oui
--
-- Si une ligne affiche « NON » : arrêtez-vous et envoyez-moi le tableau.
-- ====================================================================

-- --------------------------------------------------------------------
-- 0003 — Le pont entre Supabase Auth et les profils
--
-- Sans ce pont, créer un compte dans Auth ne crée AUCUN profil. Et comme
-- toutes les politiques RLS reposent sur `mon_role()`, qui lit `profils`, un
-- compte authentifié sans profil ne peut rien lire ni écrire : l'agent
-- s'inscrit, se connecte, et son écran reste vide sans aucune erreur visible.
--
-- L'agent s'identifie par son MATRICULE, pas par un courriel. Auth exige un
-- identifiant de type courriel : l'inscription en fabrique un, interne et
-- jamais montré (AG1042@agents.siira.app). Le matricule réel voyage dans les
-- métadonnées de l'inscription, et c'est lui que le profil garde.
-- --------------------------------------------------------------------

-- Le profil appartient à un compte Auth : si le compte disparaît, le profil
-- suit. La contrainte manquait, ce qui laissait passer des profils orphelins.
ALTER TABLE public.profils
  DROP CONSTRAINT IF EXISTS profils_id_fkey;
ALTER TABLE public.profils
  ADD CONSTRAINT profils_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

/* Crée le profil à l'instant où le compte Auth naît.

   SECURITY DEFINER : le déclencheur écrit dans `profils`, que les politiques
   RLS protègent — il doit passer outre, car à cet instant l'utilisateur n'a
   précisément pas encore de profil pour prouver son rôle.

   Le rôle vient des métadonnées de l'inscription, mais n'est JAMAIS pris au
   mot pour « admin » : un client peut écrire ce qu'il veut dans ses propres
   métadonnées. Une inscription qui se réclame admin devient un agent ; les
   comptes d'équipe se posent à la main ou par la clé de service. */
CREATE OR REPLACE FUNCTION public.creer_profil_a_l_inscription()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  donnees   jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  role_voulu text  := COALESCE(donnees->>'role', 'agent');
  role_final text;
BEGIN
  -- « admin » ne s'auto-attribue pas : seule la clé de service le pose.
  role_final := CASE WHEN role_voulu IN ('agent', 'centre') THEN role_voulu
                     ELSE 'agent' END;

  INSERT INTO public.profils (
    id, nom, prenoms, role, statut, matricule, centre_sante, telephone, email
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(donnees->>'nom', ''), 'Sans nom'),
    NULLIF(donnees->>'prenoms', ''),
    role_final,
    NULLIF(donnees->>'statut', ''),
    NULLIF(donnees->>'matricule', ''),
    NULLIF(donnees->>'centre_sante', ''),
    NULLIF(donnees->>'telephone', ''),
    -- Le courriel interne ne vaut pas une adresse : on ne le recopie pas.
    CASE WHEN NEW.email LIKE '%@agents.siira.app' THEN NULL ELSE NEW.email END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profil_a_l_inscription ON auth.users;
CREATE TRIGGER profil_a_l_inscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.creer_profil_a_l_inscription();

/* Un agent doit pouvoir vérifier qu'un matricule est libre AVANT de s'inscrire,
   sans lire les profils des autres. Cette fonction ne rend qu'un booléen, et
   compare le matricule sans casse ni séparateurs — comme l'index unique. */
CREATE OR REPLACE FUNCTION public.matricule_est_libre(matricule_demande text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profils
    WHERE upper(regexp_replace(matricule, '[^A-Za-z0-9]', '', 'g'))
        = upper(regexp_replace(matricule_demande, '[^A-Za-z0-9]', '', 'g'))
  )
$$;

-- Lisible par un visiteur non connecté : c'est tout l'intérêt, et elle ne
-- révèle rien d'autre que « libre » ou « pris ».
GRANT EXECUTE ON FUNCTION public.matricule_est_libre(text) TO anon, authenticated, service_role;

-- ====================================================================
-- VÉRIFICATION — les trois lignes doivent afficher « oui »
-- ====================================================================

SELECT '1. profils rattache a auth.users' AS controle,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_constraint
          WHERE conname = 'profils_id_fkey' AND conrelid = 'public.profils'::regclass
       ) THEN 'oui' ELSE 'NON' END AS resultat
UNION ALL
SELECT '2. declencheur d inscription',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_trigger
          WHERE tgname = 'profil_a_l_inscription' AND NOT tgisinternal
       ) THEN 'oui' ELSE 'NON' END
UNION ALL
SELECT '3. fonction matricule_est_libre',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'matricule_est_libre'
       ) THEN 'oui' ELSE 'NON' END
ORDER BY controle;

NOTIFY pgrst, 'reload schema';
