/* =====================================================================
   0004 — Le référentiel des structures de santé, et ce qui les sépare
   =====================================================================

   Deux populations de structures vivaient jusqu'ici dans la même table
   `centres`, sans rien pour les distinguer :

   - la structure DE BASE (CSPS, CMA) : là où l'agent de santé travaille et
     reçoit la femme. Elle ne reçoit AUCUNE orientation ;
   - le centre SPÉCIALISÉ (CHU, CHR, polyclinique) : là où part le dossier,
     et où exerce le spécialiste qui ouvre un compte.

   Pourquoi une colonne et pas une déduction depuis `examens` : plusieurs CMA
   disposent d'un échographe. Un niveau « orange » n'exige que l'échographie,
   donc un CMA aurait été proposé comme destination d'orientation — l'agent
   aurait envoyé le dossier à une structure sans sénologue. La nature d'une
   structure est une donnée, pas une conséquence de son équipement.

   `base` est le défaut : une structure inconnue ne reçoit pas d'orientation.
   Se tromper dans ce sens est sans danger ; l'inverse envoie une femme au
   mauvais endroit.
   ===================================================================== */

ALTER TABLE public.centres
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'base';

ALTER TABLE public.centres DROP CONSTRAINT IF EXISTS centres_type_connu;
ALTER TABLE public.centres
  ADD CONSTRAINT centres_type_connu CHECK (type IN ('base', 'specialise'));

/* Le district de rattachement : il sert à mesurer la distance que la femme
   aura à parcourir. Facultatif — un CHU national ne dépend d'aucun district. */
ALTER TABLE public.centres
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL;

/* Un spécialiste est rattaché à un centre spécialisé, jamais à un CSPS :
   sinon il reçoit des dossiers qu'il ne peut pas traiter. La contrainte est
   portée par une fonction, car une contrainte CHECK ne peut pas lire une
   autre table. */
CREATE OR REPLACE FUNCTION public.centre_est_specialise(centre uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.centres WHERE id = centre AND type = 'specialise')
$$;

/* Les structures de base doivent être lisibles AVANT la connexion :
   l'écran d'inscription de l'agent demande où il travaille, et il n'a pas
   encore de compte. Ne sont exposées que le nom et la commune — ni places,
   ni tarifs, ni coordonnées précises. */
CREATE OR REPLACE VIEW public.structures_de_base AS
  SELECT c.id, c.nom, c.service AS commune
  FROM public.centres c
  WHERE c.type = 'base' AND c.actif
  ORDER BY c.nom;

GRANT SELECT ON public.structures_de_base TO anon, authenticated;

/* Idem pour les centres spécialisés : l'écran d'inscription du spécialiste
   doit proposer la liste des centres avant qu'il ait un compte. */
CREATE OR REPLACE VIEW public.centres_specialises AS
  SELECT c.id, c.nom, c.service
  FROM public.centres c
  WHERE c.type = 'specialise' AND c.actif
  ORDER BY c.nom;

GRANT SELECT ON public.centres_specialises TO anon, authenticated;

/* ---------------------------------------------------------------------
   Districts sanitaires — région du Centre et pourtour de Ouagadougou
   --------------------------------------------------------------------- */

INSERT INTO public.districts (nom, latitude, longitude) VALUES
  ('Bogodogo',    12.3217, -1.4694),
  ('Boulmiougou', 12.3450, -1.5550),
  ('Nongr-Massom',12.4150, -1.4750),
  ('Sig-Nonghin', 12.4000, -1.5400),
  ('Baskuy',      12.3686, -1.5275),
  ('Saaba',       12.3858, -1.3678),
  ('Ziniaré',     12.5819, -1.2969),
  ('Koubri',      12.1878, -1.4017),
  ('Loumbila',    12.5086, -1.4053)
ON CONFLICT (nom) DO NOTHING;

/* ---------------------------------------------------------------------
   Structures de base — là où l'agent exerce
   `service` porte la commune : c'est ce qui aide l'agent à reconnaître la
   sienne dans une liste, deux CSPS pouvant porter le même nom de quartier.
   Elles n'ont pas de places d'orientation : elles n'en reçoivent pas.
   --------------------------------------------------------------------- */

INSERT INTO public.centres (nom, service, type, latitude, longitude, examens, places_semaine, district_id)
SELECT v.nom, v.commune, 'base', v.lat, v.lon, '{}'::text[], 0, d.id
FROM (VALUES
  ('CSPS de Dassasgho',        'Ouagadougou — Bogodogo',    12.3889, -1.4639, 'Bogodogo'),
  ('CSPS de Wemtenga',         'Ouagadougou — Bogodogo',    12.3744, -1.4792, 'Bogodogo'),
  ('CSPS de Zogona',           'Ouagadougou — Bogodogo',    12.3817, -1.4919, 'Bogodogo'),
  ('CSPS de Pissy',            'Ouagadougou — Boulmiougou', 12.3372, -1.5614, 'Boulmiougou'),
  ('CSPS de Kilwin',           'Ouagadougou — Boulmiougou', 12.3889, -1.5589, 'Boulmiougou'),
  ('CSPS de Tanghin',          'Ouagadougou — Nongr-Massom',12.4089, -1.5047, 'Nongr-Massom'),
  ('CSPS de Polesgo',          'Ouagadougou — Nongr-Massom',12.4417, -1.4583, 'Nongr-Massom'),
  ('CSPS de Nioko II',         'Ouagadougou — Nongr-Massom',12.4283, -1.4506, 'Nongr-Massom'),
  ('CSPS de Kossodo',          'Ouagadougou — Nongr-Massom',12.4194, -1.4903, 'Nongr-Massom'),
  ('CSPS de Somgandé',         'Ouagadougou — Sig-Nonghin', 12.4247, -1.5106, 'Sig-Nonghin'),
  ('CSPS de Cissin',           'Ouagadougou — Baskuy',      12.3450, -1.5333, 'Baskuy'),
  ('CSPS de Gounghin',         'Ouagadougou — Baskuy',      12.3672, -1.5456, 'Baskuy'),
  ('CSPS de Saaba',            'Saaba',                     12.3858, -1.3678, 'Saaba'),
  ('CSPS de Koubri',           'Koubri',                    12.1878, -1.4017, 'Koubri'),
  ('CSPS de Loumbila',         'Loumbila',                  12.5086, -1.4053, 'Loumbila'),
  ('CMA de Pissy',             'Ouagadougou — Boulmiougou', 12.3400, -1.5650, 'Boulmiougou'),
  ('CMA du Secteur 30',        'Ouagadougou — Bogodogo',    12.3406, -1.4989, 'Bogodogo'),
  ('CMA de Kossodo',           'Ouagadougou — Nongr-Massom',12.4211, -1.4878, 'Nongr-Massom'),
  ('CMA de Ziniaré',           'Ziniaré',                   12.5819, -1.2969, 'Ziniaré')
) AS v(nom, commune, lat, lon, district)
LEFT JOIN public.districts d ON d.nom = v.district
WHERE NOT EXISTS (SELECT 1 FROM public.centres c WHERE c.nom = v.nom);

/* ---------------------------------------------------------------------
   Centres spécialisés — là où part le dossier, et où exerce le spécialiste
   Les examens déclarés commandent l'orientation : « rouge » exige
   échographie ET biopsie, « orange » l'échographie seule.
   --------------------------------------------------------------------- */

INSERT INTO public.centres (nom, service, type, latitude, longitude, examens, places_semaine, district_id)
SELECT v.nom, v.service, 'specialise', v.lat, v.lon, v.examens::text[], v.places, d.id
FROM (VALUES
  ('CHU de Bogodogo',          'Service de gynécologie et sénologie', 12.3217, -1.4694,
     '{echographie,mammographie,biopsie}', 10, 'Bogodogo'),
  ('CHU Yalgado Ouédraogo',    'Service de chirurgie générale',       12.3772, -1.5203,
     '{echographie,mammographie,biopsie}', 12, 'Baskuy'),
  ('CHU de Tengandogo',        'Service d''oncologie',                12.2894, -1.4747,
     '{echographie,biopsie}',               8, 'Bogodogo'),
  ('CHU Pédiatrique Charles de Gaulle', 'Imagerie médicale',          12.3625, -1.5094,
     '{echographie}',                       6, 'Baskuy'),
  ('CHR de Ziniaré',           'Maternité et imagerie',               12.5819, -1.2969,
     '{echographie}',                       6, 'Ziniaré'),
  ('Polyclinique Notre-Dame de la Paix', 'Imagerie et sénologie',     12.3703, -1.5092,
     '{echographie,mammographie}',          5, 'Baskuy')
) AS v(nom, service, lat, lon, examens, places, district)
LEFT JOIN public.districts d ON d.nom = v.district
WHERE NOT EXISTS (SELECT 1 FROM public.centres c WHERE c.nom = v.nom);

/* Créneaux : sans créneau libre, `choisirCentre` n'élit AUCUN centre et
   l'agent voit « aucune place » alors que le référentiel est peuplé. On
   ouvre quatre semaines de rendez-vous ouvrables, à raison des places
   déclarées par chaque centre. */
INSERT INTO public.creneaux (centre_id, debut, libre)
SELECT c.id,
       (date_trunc('day', now()) + (j || ' days')::interval + (8 + (n % 6)) * interval '1 hour'),
       true
FROM public.centres c
CROSS JOIN generate_series(1, 28) AS j
CROSS JOIN generate_series(1, 2)  AS n
WHERE c.type = 'specialise'
  AND extract(dow from date_trunc('day', now()) + (j || ' days')::interval) BETWEEN 1 AND 5
  AND NOT EXISTS (SELECT 1 FROM public.creneaux x WHERE x.centre_id = c.id);

/* Tarifs indicatifs, en francs CFA. Le public n'est pas facturé dans les
   mêmes termes que le privé : la polyclinique est volontairement plus chère,
   c'est ce qui donne du sens à la prise en charge par un financeur. */
INSERT INTO public.tarifs (centre_id, soin, montant)
SELECT c.id, v.soin, v.montant
FROM public.centres c
CROSS JOIN (VALUES
  ('consultation', 2000), ('echographie', 7500), ('biopsie', 25000), ('transport', 1500)
) AS v(soin, montant)
WHERE c.type = 'specialise' AND c.nom NOT LIKE 'Polyclinique%'
ON CONFLICT (centre_id, soin) DO NOTHING;

INSERT INTO public.tarifs (centre_id, soin, montant)
SELECT c.id, v.soin, v.montant
FROM public.centres c
CROSS JOIN (VALUES
  ('consultation', 10000), ('echographie', 20000), ('biopsie', 60000), ('transport', 1500)
) AS v(soin, montant)
WHERE c.type = 'specialise' AND c.nom LIKE 'Polyclinique%'
ON CONFLICT (centre_id, soin) DO NOTHING;

/* Contrôles. Ils ne décrivent pas ce qu'on espère : ils échouent si le
   référentiel est inutilisable. */
SELECT '1. structures de base'   AS controle, count(*) AS valeur FROM public.centres WHERE type = 'base'
UNION ALL
SELECT '2. centres specialises',  count(*) FROM public.centres WHERE type = 'specialise'
UNION ALL
SELECT '3. districts',            count(*) FROM public.districts
UNION ALL
SELECT '4. centres rouge (echo+biopsie)', count(*) FROM public.centres
  WHERE type = 'specialise' AND examens @> '{echographie,biopsie}'::text[]
UNION ALL
SELECT '5. creneaux libres',      count(*) FROM public.creneaux WHERE libre
UNION ALL
SELECT '6. base sans orientation (doit valoir 0)', count(*) FROM public.centres
  WHERE type = 'base' AND places_semaine > 0
ORDER BY controle;

/* ---------------------------------------------------------------------
   Le déclencheur apprend à poser le centre du spécialiste
   ---------------------------------------------------------------------
   La version de 0003 n'écrivait ni `centre_id`, ni `sexe`, ni `specialite` :
   une inscription de rôle « centre » violait donc `profils_centre_coherent`
   et rendait un 500 à l'écran. Un rôle « centre » sans centre valide est
   rétrogradé en agent plutôt que refusé : un compte sans profil ne peut
   RIEN lire ni écrire, et l'écran reste vide sans aucune erreur visible.
   --------------------------------------------------------------------- */

CREATE OR REPLACE FUNCTION public.creer_profil_a_l_inscription()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  donnees    jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  role_voulu text  := COALESCE(donnees->>'role', 'agent');
  role_final text;
  centre_demande uuid;
BEGIN
  -- « admin » ne s'auto-attribue pas : seule la clé de service le pose.
  role_final := CASE WHEN role_voulu IN ('agent', 'centre') THEN role_voulu
                     ELSE 'agent' END;

  BEGIN
    centre_demande := NULLIF(donnees->>'centre_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    centre_demande := NULL;
  END;

  -- Un centre de BASE ne porte pas de spécialiste : le rattachement est
  -- refusé, et le compte devient un agent de ce centre.
  IF role_final = 'centre' AND NOT public.centre_est_specialise(centre_demande) THEN
    role_final := 'agent';
    centre_demande := NULL;
  END IF;

  INSERT INTO public.profils (
    id, nom, prenoms, sexe, specialite, role, statut,
    matricule, centre_sante, centre_id, telephone, email
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(donnees->>'nom', ''), 'Sans nom'),
    NULLIF(donnees->>'prenoms', ''),
    NULLIF(donnees->>'sexe', ''),
    NULLIF(donnees->>'specialite', ''),
    role_final,
    NULLIF(donnees->>'statut', ''),
    NULLIF(donnees->>'matricule', ''),
    NULLIF(donnees->>'centre_sante', ''),
    centre_demande,
    NULLIF(donnees->>'telephone', ''),
    CASE WHEN NEW.email LIKE '%@agents.siira.app' THEN NULL ELSE NEW.email END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
