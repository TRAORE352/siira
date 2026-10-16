-- ====================================================================
-- Épreuve des migrations Siira, sur un PostgreSQL local.
--
-- Elle joue ce qu'un simple test unitaire ne peut pas voir : la base
-- refuse-t-elle vraiment ce qu'elle doit refuser, et accepte-t-elle
-- toujours ce qui doit passer ? Chaque bloc annonce ce qu'il attend.
-- ====================================================================

\set ON_ERROR_STOP off

-- Repartir d'une base vide pour que le test soit rejouable.
TRUNCATE public.suivis, public.financements, public.orientations;
DELETE FROM public.consultations;
DELETE FROM public.patientes;

INSERT INTO public.districts (id, nom, latitude, longitude)
VALUES ('d0000000-0000-0000-0000-000000000001', 'Saaba', 12.30, -1.40)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.centres (id, nom, service, latitude, longitude, examens, places_semaine)
VALUES ('c0000000-0000-0000-0000-000000000001', 'CHU de Bogodogo', 'Gynécologie',
        12.35, -1.45, ARRAY['echographie','biopsie'], 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tarifs (centre_id, soin, montant)
VALUES ('c0000000-0000-0000-0000-000000000001', 'consultation', 10000),
       ('c0000000-0000-0000-0000-000000000001', 'echographie', 15000)
ON CONFLICT DO NOTHING;

INSERT INTO public.ongs (id, nom, budget_total, budget_restant)
VALUES ('0000000a-0000-0000-0000-00000000000a', 'Fonds Yennenga', 100000, 100000),
       ('0000000b-0000-0000-0000-00000000000b', 'Alliance Wendpanga', 100000, 100000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creneaux (id, centre_id, debut, libre)
VALUES ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', now() + interval '3 days', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profils (id, nom, role, matricule, telephone, centre_id)
VALUES ('a0000000-0000-0000-0000-0000000000a1', 'Agent A', 'agent', 'AG-0001', '70123456', NULL),
       ('a0000000-0000-0000-0000-0000000000a2', 'Agent B', 'agent', 'AG-0002', '71123456', NULL),
       ('c0000000-0000-0000-0000-0000000000c1', 'Centre Bogodogo', 'centre', 'CT-0001', NULL, 'c0000000-0000-0000-0000-000000000001'),
       ('d0000000-0000-0000-0000-0000000000d1', 'Équipe Siira', 'admin', 'SIIRA-ADMIN', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patientes (id, code, agent_id, nom, age, district_id, capacite_paiement, consentement)
VALUES ('f0000000-0000-0000-0000-0000000000f1', 'Cas 0401', 'a0000000-0000-0000-0000-0000000000a1',
        'Awa Compaoré', 41, 'd0000000-0000-0000-0000-000000000001', 'ne_peut_pas', false)
ON CONFLICT (id) DO NOTHING;

\echo ''
\echo '=== 1. Sans consentement, la consultation est refusée (attendu : refus) ==='
DO $$
BEGIN
  INSERT INTO public.consultations (patiente_id, agent_id, recit)
  VALUES ('f0000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-0000000000a1',
          'Elle a une boule au sein gauche depuis deux mois, sans douleur.');
  RAISE NOTICE 'ECHEC : la consultation est passée sans consentement';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK : refusée — %', SQLERRM;
END $$;

UPDATE public.patientes SET consentement = true WHERE id = 'f0000000-0000-0000-0000-0000000000f1';

\echo ''
\echo '=== 2. Avec consentement, elle passe (attendu : passée) ==='
INSERT INTO public.consultations (id, patiente_id, agent_id, recit, statut, niveau_propose, niveau_valide)
VALUES ('f0000000-0000-0000-0000-0000000000f2', 'f0000000-0000-0000-0000-0000000000f1',
        'a0000000-0000-0000-0000-0000000000a1',
        'Elle a une boule au sein gauche depuis deux mois, sans douleur.', 'validee', 'rouge', 'rouge')
ON CONFLICT (id) DO NOTHING;
\echo 'OK : consultation enregistrée'

\echo ''
\echo '=== 3. Une étape ne se saute pas (attendu : refus de brouillon vers résultat) ==='
INSERT INTO public.orientations (id, consultation_id, centre_id, creneau_id, statut)
VALUES ('00000000-0000-0000-0000-00000000001a', 'f0000000-0000-0000-0000-0000000000f2',
        'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'brouillon')
ON CONFLICT (id) DO NOTHING;
UPDATE public.orientations SET statut = 'envoyee' WHERE id = '00000000-0000-0000-0000-00000000001a';
\echo 'OK : envoyée (brouillon -> envoyée acceptée, envoyee_le posé automatiquement)'
DO $$
BEGIN
  UPDATE public.orientations SET statut = 'resultat' WHERE id = '00000000-0000-0000-0000-00000000001a';
  RAISE NOTICE 'ECHEC : envoyée -> résultat est passée';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK : refusée — %', SQLERRM;
END $$;

\echo ''
\echo '=== 4. Deux financeurs ne financent pas le même dossier (attendu : 1 accord, 1 refus) ==='
INSERT INTO public.financements (id, orientation_id, ong_id, montant)
VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000001a',
        '0000000a-0000-0000-0000-00000000000a', 25000),
       ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000001a',
        '0000000b-0000-0000-0000-00000000000b', 25000)
ON CONFLICT (id) DO NOTHING;

SET request.jwt.claim.sub = 'c0000000-0000-0000-0000-0000000000c1';
SET request.jwt.claims = '{"role":"authenticated"}';
SELECT confirmer_financement('00000000-0000-0000-0000-0000000000a1');
\echo '--- après le premier accord ---'
SELECT nom, budget_restant FROM public.ongs ORDER BY nom;
SELECT statut FROM public.financements ORDER BY id;

DO $$
BEGIN
  PERFORM public.confirmer_financement('00000000-0000-0000-0000-0000000000b2');
  RAISE NOTICE 'ECHEC : un second financeur a confirmé le même dossier';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK : second accord refusé — %', SQLERRM;
END $$;

\echo ''
\echo '=== 5. L''agent A ne voit que ses patientes (attendu : 1 pour A, 0 pour B) ==='
INSERT INTO public.patientes (id, code, agent_id, nom, age, district_id, capacite_paiement, consentement)
VALUES ('f0000000-0000-0000-0000-0000000000f9', 'Cas 0402', 'a0000000-0000-0000-0000-0000000000a2',
        'Fatou Zongo', 28, 'd0000000-0000-0000-0000-000000000001', 'peut_payer', true)
ON CONFLICT (id) DO NOTHING;

SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000a1';
SET request.jwt.claims = '{"role":"authenticated"}';
SELECT 'Agent A voit : ' || count(*) FROM public.patientes;

SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000a2';
SELECT 'Agent B voit : ' || count(*) FROM public.patientes;

\echo '=== 6. L''agent ne peut pas se promouvoir (attendu : rôle inchangé) ==='
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000a1';
UPDATE public.profils SET role = 'admin', nom = 'Agent A modifié'
 WHERE id = 'a0000000-0000-0000-0000-0000000000a1';
RESET ROLE;
SELECT 'rôle après tentative : ' || role || ', nom : ' || nom
  FROM public.profils WHERE id = 'a0000000-0000-0000-0000-0000000000a1';

\echo ''
\echo '=== 7. La remise à zéro est réservée à l''équipe (attendu : refus pour l''agent) ==='
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000a1';
DO $$
BEGIN
  PERFORM public.reinitialiser_demonstration();
  RAISE NOTICE 'ECHEC : un agent a remis la démonstration à zéro';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'OK : refusée — %', SQLERRM;
END $$;
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.sub = 'd0000000-0000-0000-0000-0000000000d1';
SELECT 'Admin, comptes visibles : ' || count(*) FROM public.profils;
DO $$
BEGIN
  PERFORM public.reinitialiser_demonstration();
  RAISE NOTICE 'OK : remise à zéro exécutée par l''équipe';
END $$;
SELECT 'Après remise à zéro — patientes : ' || count(*) FROM public.patientes;
SELECT 'Budget remis : ' || budget_restant FROM public.ongs ORDER BY nom LIMIT 1;
RESET ROLE;
