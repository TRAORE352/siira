-- =============================================================================
-- Siira — données de démo (section 14.1 du cahier des charges)
-- À exécuter dans l'éditeur SQL Supabase APRÈS les migrations.
-- Les comptes Auth (email/mot de passe) doivent être créés dans Supabase Auth ;
-- les user_id ci-dessous doivent correspondre aux utilisateurs créés.
-- =============================================================================

-- Réinitialisation complète de la démo.
truncate table public.suivis, public.financements, public.regles_financement,
  public.ong, public.orientations, public.consultations, public.patientes,
  public.tarifs, public.creneaux, public.centres, public.districts, public.profils
  restart identity cascade;

-- ---------------------------------------------------------------------------
-- Districts (chefs-lieux, coordonnées approximatives)
-- ---------------------------------------------------------------------------
insert into public.districts (id, nom, latitude, longitude) values
  ('00000000-0000-4000-8000-000000000001', 'Saaba',    12.383, -1.450),
  ('00000000-0000-4000-8000-000000000002', 'Ziniaré',  12.580, -1.300),
  ('00000000-0000-4000-8000-000000000003', 'Koubri',   12.200, -1.400),
  ('00000000-0000-4000-8000-000000000004', 'Loumbila', 12.500, -1.350);

-- ---------------------------------------------------------------------------
-- Centres spécialisés
-- ---------------------------------------------------------------------------
insert into public.centres (id, nom, service, latitude, longitude, examens, places_semaine) values
  ('10000000-0000-4000-8000-000000000001', 'CHU de Bogodogo',       'Oncologie', 12.350, -1.490, array['echographie','mammographie','biopsie'], 10),
  ('10000000-0000-4000-8000-000000000002', 'CHU de Tengandogo',     'Oncologie', 12.330, -1.420, array['echographie','biopsie'], 8),
  ('10000000-0000-4000-8000-000000000003', 'CHU Yalgado Ouédraogo', 'Oncologie', 12.370, -1.520, array['echographie','mammographie','biopsie'], 12),
  ('10000000-0000-4000-8000-000000000004', 'CHR de Ziniaré',        'Chirurgie', 12.580, -1.300, array['echographie'], 6);

-- ---------------------------------------------------------------------------
-- Tarifs indicatifs ([TARIF] à valider par l'équipe — valeurs de démo).
-- Identiques pour tous les centres.
-- ---------------------------------------------------------------------------
insert into public.tarifs (centre_id, soin, montant)
select c.id, t.soin, t.montant
from public.centres c
cross join (values
  ('consultation', 5000),
  ('echographie',  15000),
  ('biopsie',      40000),
  ('transport',    10000)
) as t(soin, montant);

-- ---------------------------------------------------------------------------
-- Créneaux : un créneau libre par jour pendant 30 jours, pour chaque centre.
-- ---------------------------------------------------------------------------
insert into public.creneaux (centre_id, debut, libre)
select c.id, date_trunc('day', now()) + (n || ' days')::interval + interval '10 hours', true
from public.centres c
cross join generate_series(1, 30) as n;

-- ---------------------------------------------------------------------------
-- ONG
-- ---------------------------------------------------------------------------
insert into public.ong (id, nom, budget_total, budget_restant) values
  ('20000000-0000-4000-8000-000000000001', 'Rose Solidaire', 500000, 500000),
  ('20000000-0000-4000-8000-000000000002', 'Espoir Féminin', 1000000, 1000000);

-- ---------------------------------------------------------------------------
-- Règles de financement
--   Rose Solidaire : Saaba + Koubri, rouge uniquement.
--   Espoir Féminin : tous les districts, orange + rouge.
-- ---------------------------------------------------------------------------
insert into public.regles_financement (ong_id, districts, niveaux, situations, active) values
  ('20000000-0000-4000-8000-000000000001',
   array['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003'],
   array['rouge'], array['partielle','ne_peut_pas'], true),
  ('20000000-0000-4000-8000-000000000002',
   array['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',
         '00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'],
   array['orange','rouge'], array['partielle','ne_peut_pas'], true);

-- ---------------------------------------------------------------------------
-- Profils (3 agents, 4 centres, 2 ONG, 1 admin).
-- user_id = identifiants Auth à créer dans Supabase Auth.
-- ---------------------------------------------------------------------------
insert into public.profils (id, user_id, nom, role, centre_sante, centre_id, ong_id) values
  ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Agent Saaba',    'agent',  'CSPS de Saaba',    null, null),
  ('30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Agent Ziniaré',  'agent',  'CSPS de Ziniaré',  null, null),
  ('30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'Agent Koubri',   'agent',  'CSPS de Koubri',   null, null),
  ('30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'CHU Bogodogo',   'centre', null, '10000000-0000-4000-8000-000000000001', null),
  ('30000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005', 'CHU Tengandogo', 'centre', null, '10000000-0000-4000-8000-000000000002', null),
  ('30000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006', 'CHU Yalgado',    'centre', null, '10000000-0000-4000-8000-000000000003', null),
  ('30000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', 'CHR Ziniaré',    'centre', null, '10000000-0000-4000-8000-000000000004', null),
  ('30000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000008', 'Rose Solidaire', 'ong',    null, null, '20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000009', 'Espoir Féminin', 'ong',    null, null, '20000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000010', 'Admin Siira',    'admin',  null, null, null);

-- ---------------------------------------------------------------------------
-- Patientes fictives (8, à différents stades du parcours — remplissent les
-- listes et le tableau d'impact). Les cas de démo en direct (Awa, Aminata,
-- Fatou) sont saisis pendant le pitch.
-- ---------------------------------------------------------------------------
insert into public.patientes (id, agent_id, nom, age, district_id, village, telephone, capacite_paiement, consentement, code) values
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Halimata Sawadogo', 45, '00000000-0000-4000-8000-000000000001', 'Saaba',  '70112233', 'ne_peut_pas', true, 'Cas 0401'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'Mariam Ouédraogo', 38, '00000000-0000-4000-8000-000000000003', 'Koubri', '70223344', 'partielle',   true, 'Cas 0402'),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Aïcha Kaboré',     52, '00000000-0000-4000-8000-000000000002', 'Ziniaré', '70334455', 'ne_peut_pas', true, 'Cas 0403'),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'Salimata Traoré',  29, '00000000-0000-4000-8000-000000000001', 'Saaba',  '70445566', 'peut_payer',  true, 'Cas 0404'),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', 'Rasmata Compaoré', 61, '00000000-0000-4000-8000-000000000003', 'Koubri', '70556677', 'ne_peut_pas', true, 'Cas 0405'),
  ('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 'Adjara Sanou',     33, '00000000-0000-4000-8000-000000000004', 'Loumbila', null,    'partielle',   true, 'Cas 0406'),
  ('50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000001', 'Fatimata Zongo',   47, '00000000-0000-4000-8000-000000000001', 'Saaba',  '70667788', 'ne_peut_pas', true, 'Cas 0407'),
  ('50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000002', 'Clarisse Ilboudo', 36, '00000000-0000-4000-8000-000000000002', 'Ziniaré', '70778899', 'partielle',   true, 'Cas 0408');

-- ---------------------------------------------------------------------------
-- Quelques consultations déjà classées (pour remplir les listes).
-- ---------------------------------------------------------------------------
insert into public.consultations (id, patiente_id, agent_id, recit, fiche, niveau_propose, regles_declenchees, niveau_valide, statut) values
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Elle sent une boule au sein gauche depuis trois semaines, la peau est un peu tirée, pas de douleur.',
   '{"sein":"gauche","masse":true,"masse_dure":null,"masse_fixe":null,"duree_semaines":3,"douleur":"aucune","peau":["retraction"],"mamelon_retraction_recente":null,"ecoulement":null,"ecoulement_un_cote":null,"ganglion_aisselle":null,"antecedents_familiaux":null,"autres":null}',
   'rouge', array['R1','R5'], 'rouge', 'validee'),
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003',
   'Une petite masse au sein droit qui bouge sous les doigts depuis dix jours.',
   '{"sein":"droit","masse":true,"masse_dure":null,"masse_fixe":false,"duree_semaines":1,"douleur":null,"peau":[],"mamelon_retraction_recente":null,"ecoulement":null,"ecoulement_un_cote":null,"ganglion_aisselle":null,"antecedents_familiaux":null,"autres":null}',
   'orange', array['O1'], 'orange', 'validee'),
  ('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001',
   'Douleur des deux seins avant les règles, pas de masse constatée.',
   '{"sein":"les_deux","masse":false,"masse_dure":null,"masse_fixe":null,"duree_semaines":null,"douleur":"deux_seins_cyclique","peau":[],"mamelon_retraction_recente":null,"ecoulement":null,"ecoulement_un_cote":null,"ganglion_aisselle":null,"antecedents_familiaux":null,"autres":null}',
   'vert', array['V1'], 'vert', 'close');

-- ---------------------------------------------------------------------------
-- Deux orientations envoyées + financements, pour remplir centre/ONG/impact.
-- ---------------------------------------------------------------------------
insert into public.orientations (id, consultation_id, centre_id, score, statut, envoyee_le) values
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 87.3, 'envoyee', now() - interval '2 days'),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 81.5, 'envoyee', now() - interval '1 day');

insert into public.financements (orientation_id, ong_id, montant, statut) values
  ('70000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 70000, 'confirmee'),
  ('70000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 70000, 'retiree'),
  ('70000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 30000, 'proposee');

insert into public.suivis (orientation_id, etape, resultat, note, auteur_id) values
  ('70000000-0000-4000-8000-000000000001', 'recue', 'en_attente', 'Patiente reçue en oncologie.', '30000000-0000-4000-8000-000000000004');
