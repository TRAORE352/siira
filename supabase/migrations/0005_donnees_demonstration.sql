/* =====================================================================
   0005 — Trois dossiers de démonstration, vus des deux côtés
   =====================================================================

   Un seul jeu de trois patientes, pas deux : l'agent KABORE les enregistre,
   le spécialiste TOURE les reçoit. C'est le même dossier qui traverse, et
   c'est précisément ce que la démonstration doit montrer — deux écrans, une
   seule réalité. Trois dossiers séparés de chaque côté auraient montré deux
   applications sans lien.

   Les trois niveaux d'urgence sont représentés parce que la démonstration les
   exige : rouge (parti, examens en cours), orange (reçu au centre), vert
   (pas d'orientation — un cas vert ne part pas, et c'est la règle).

   Aucune donnée réelle : noms, âges et récits sont inventés. Les récits
   restent plausibles pour que le classement par règles ait un sens.
   ===================================================================== */

DO $$
DECLARE
  agent_id   uuid;
  medecin_id uuid;
  le_centre  uuid;
  district   uuid;
  p1 uuid; p2 uuid; p3 uuid;
  c1 uuid; c2 uuid; c3 uuid;
  o1 uuid; o2 uuid;
  cr1 uuid; cr2 uuid;
BEGIN
  SELECT id INTO agent_id   FROM public.profils WHERE matricule = 'AG1042';
  SELECT id INTO medecin_id FROM public.profils WHERE matricule = 'CS2087';
  SELECT centre_id INTO le_centre FROM public.profils WHERE matricule = 'CS2087';
  SELECT id INTO district FROM public.districts WHERE nom = 'Bogodogo';

  IF agent_id IS NULL OR medecin_id IS NULL THEN
    RAISE EXCEPTION 'Comptes AG1042 / CS2087 absents : les creer avant ce jeu de donnees';
  END IF;

  /* Les codes ne sont pas des matricules de patientes : ce sont les
     identifiants anonymes que l'agent lit à voix haute. */

  -- 1. ROUGE — masse dure, rétraction : le cas qui part tout de suite
  INSERT INTO public.patientes (code, agent_id, nom, age, district_id, village, telephone, capacite_paiement, consentement)
  VALUES ('PA-2041', agent_id, 'OUEDRAOGO Aminata', 47, district, 'Dassasgho', '70112233', 'ne_peut_pas', true)
  RETURNING id INTO p1;

  INSERT INTO public.consultations (patiente_id, agent_id, recit, niveau_propose, regles_declenchees, explication, niveau_valide, statut)
  VALUES (p1, agent_id,
    'Elle a senti une boule dure dans le sein droit il y a trois mois. La boule ne bouge pas quand on appuie. Le mamelon est rentre vers l''interieur depuis quelques semaines. Elle dit avoir mal la nuit.',
    'rouge', '{R1,O1,O2}',
    'Une masse dure et fixe accompagnee d''une retraction du mamelon demande un avis specialise sans attendre.',
    'rouge', 'validee')
  RETURNING id INTO c1;

  SELECT id INTO cr1 FROM public.creneaux WHERE centre_id = le_centre AND libre ORDER BY debut LIMIT 1;

  INSERT INTO public.orientations (consultation_id, centre_id, creneau_id, score, resume_ia, statut, envoyee_le)
  VALUES (c1, le_centre, cr1, 92.50,
    'Femme de 47 ans, masse dure fixe du sein droit evoluant depuis trois mois, retraction du mamelon. Sans ressources. Echographie et biopsie demandees.',
    /* Le statut n'est PAS pose a la main : le declencheur
       `avancer_orientation` le fait avancer a chaque suivi saisi, et il
       refuse les sauts d'etape (« Transition refusee : examens vers recue »).
       On part donc de `envoyee`, et les suivis conduisent le dossier. */
    'envoyee', now() - interval '4 days')
  RETURNING id INTO o1;

  UPDATE public.creneaux SET libre = false WHERE id = cr1;

  -- Le dossier a deja vecu au centre : deux etapes, pas une.
  INSERT INTO public.suivis (orientation_id, etape, resultat, note, auteur_id, cree_le)
  VALUES (o1, 'recue', 'en_attente', 'Patiente accueillie, dossier ouvert.', medecin_id, now() - interval '3 days');
  INSERT INTO public.suivis (orientation_id, etape, resultat, note, auteur_id, cree_le)
  VALUES (o1, 'examens', 'en_attente', 'Echographie faite, biopsie programmee.', medecin_id, now() - interval '1 day');

  -- 2. ORANGE — reçue au centre, examens pas encore faits
  INSERT INTO public.patientes (code, agent_id, nom, age, district_id, village, telephone, capacite_paiement, consentement)
  VALUES ('PA-2042', agent_id, 'SAWADOGO Mariam', 34, district, 'Wemtenga', '76445566', 'partielle', true)
  RETURNING id INTO p2;

  INSERT INTO public.consultations (patiente_id, agent_id, recit, niveau_propose, regles_declenchees, explication, niveau_valide, statut)
  VALUES (p2, agent_id,
    'Depuis deux mois elle sent une boule mobile dans le sein gauche. La boule roule sous les doigts. Pas de douleur, pas d''ecoulement. Elle s''inquiete parce que sa tante a eu un cancer.',
    'orange', '{O1}',
    'Une masse mobile sans autre signe inquietant demande une echographie pour trancher.',
    'orange', 'validee')
  RETURNING id INTO c2;

  SELECT id INTO cr2 FROM public.creneaux WHERE centre_id = le_centre AND libre ORDER BY debut LIMIT 1;

  INSERT INTO public.orientations (consultation_id, centre_id, creneau_id, score, resume_ia, statut, envoyee_le)
  VALUES (c2, le_centre, cr2, 78.00,
    'Femme de 34 ans, masse mobile du sein gauche depuis deux mois, antecedent familial. Echographie demandee.',
    'envoyee', now() - interval '1 day')
  RETURNING id INTO o2;

  UPDATE public.creneaux SET libre = false WHERE id = cr2;

  INSERT INTO public.suivis (orientation_id, etape, resultat, note, auteur_id, cree_le)
  VALUES (o2, 'recue', 'en_attente', 'Rendez-vous confirme avec la patiente.', medecin_id, now() - interval '6 hours');

  /* 3. VERT — AUCUNE orientation, volontairement.
     Un cas vert ne part pas au centre : c'est la regle du produit, et la
     demonstration doit le montrer. Creer une orientation ici aurait
     contredit le classement affiche a l'ecran. */
  INSERT INTO public.patientes (code, agent_id, nom, age, district_id, village, telephone, capacite_paiement, consentement)
  VALUES ('PA-2043', agent_id, 'COMPAORE Fatimata', 29, district, 'Zogona', '78990011', 'peut_payer', true)
  RETURNING id INTO p3;

  INSERT INTO public.consultations (patiente_id, agent_id, recit, niveau_propose, regles_declenchees, explication, niveau_valide, statut)
  VALUES (p3, agent_id,
    'Elle a des douleurs dans les deux seins avant ses regles, et elles passent apres. Pas de boule sentie a la palpation. Pas d''ecoulement du mamelon. Elle allaite encore son dernier enfant.',
    'vert', '{V1}',
    'Des douleurs qui suivent le cycle et disparaissent apres les regles ne sont pas un signe d''alerte. Surveillance conseillee.',
    'vert', 'validee')
  RETURNING id INTO c3;

  RAISE NOTICE 'Trois dossiers crees : rouge (examens), orange (recue), vert (sans orientation).';
END $$;

/* Contrôles : ils échouent si le jeu est inutilisable. */
SELECT '1. patientes de l''agent AG1042' AS controle, count(*)::text AS valeur
  FROM public.patientes p JOIN public.profils a ON a.id = p.agent_id WHERE a.matricule = 'AG1042'
UNION ALL
SELECT '2. dossiers recus par le centre de CS2087', count(*)::text
  FROM public.orientations o
  WHERE o.centre_id = (SELECT centre_id FROM public.profils WHERE matricule = 'CS2087')
UNION ALL
SELECT '3. niveaux representes', string_agg(DISTINCT niveau_valide, ', ' ORDER BY niveau_valide)
  FROM public.consultations c JOIN public.profils a ON a.id = c.agent_id WHERE a.matricule = 'AG1042'
UNION ALL
SELECT '4. cas vert sans orientation (doit valoir 0)', count(*)::text
  FROM public.consultations c LEFT JOIN public.orientations o ON o.consultation_id = c.id
  WHERE c.niveau_valide = 'vert' AND o.id IS NOT NULL
UNION ALL
SELECT '5. etapes de suivi saisies', count(*)::text FROM public.suivis
ORDER BY controle;
