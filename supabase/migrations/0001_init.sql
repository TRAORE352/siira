# =============================================================================
# Siira — schéma initial (section 10 du cahier des charges)
# PostgreSQL / Supabase.
# Chaque table a une clé `id` (uuid) et un champ `cree_le` (timestamptz),
# non répétés ci-dessous.
# =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- Tables
-- =============================================================================

-- profils : un profil par compte de connexion (Supabase Auth).
create table if not exists public.profils (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users (id) on delete cascade,
  nom text not null,
  role text not null check (role in ('agent', 'centre', 'ong', 'admin')),
  centre_sante text,
  centre_id uuid,
  ong_id uuid,
  cree_le timestamptz not null default now()
);

-- districts : districts sanitaires (distance et règles des ONG).
create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  latitude double precision not null,
  longitude double precision not null,
  cree_le timestamptz not null default now()
);

-- centres : centres spécialisés.
create table if not exists public.centres (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  service text,
  latitude double precision not null,
  longitude double precision not null,
  examens text[] not null default '{}',
  places_semaine integer not null default 0 check (places_semaine >= 0),
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

-- creneaux : créneaux de rendez-vous.
create table if not exists public.creneaux (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  debut timestamptz not null,
  libre boolean not null default true,
  cree_le timestamptz not null default now()
);

-- tarifs : tarifs indicatifs par soin.
create table if not exists public.tarifs (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  soin text not null check (soin in ('consultation', 'echographie', 'biopsie', 'transport')),
  montant integer not null check (montant > 0),
  cree_le timestamptz not null default now()
);

-- patientes : identité, visible seulement par l'agent et le centre destinataire.
create table if not exists public.patientes (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profils (id) on delete cascade,
  nom text not null,
  age integer not null check (age between 15 and 100),
  district_id uuid not null references public.districts (id),
  village text,
  telephone text check (telephone is null or telephone ~ '^[0-9]{8}$'),
  capacite_paiement text not null check (capacite_paiement in ('peut_payer', 'partielle', 'ne_peut_pas')),
  consentement boolean not null default false,
  code text unique not null,
  cree_le timestamptz not null default now()
);

-- consultations : cas saisi et classé.
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  patiente_id uuid not null references public.patientes (id) on delete cascade,
  agent_id uuid not null references public.profils (id),
  recit text not null check (char_length(recit) between 20 and 2000),
  fiche jsonb,
  niveau_propose text check (niveau_propose in ('vert', 'orange', 'rouge')),
  regles_declenchees text[],
  explication text,
  niveau_valide text check (niveau_valide in ('vert', 'orange', 'rouge')),
  raison_correction text,
  commentaire_correction text,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'analysee', 'validee', 'close')),
  cree_le timestamptz not null default now()
);

-- orientations : transfert vers un centre spécialisé.
create table if not exists public.orientations (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid unique not null references public.consultations (id) on delete cascade,
  centre_id uuid not null references public.centres (id),
  creneau_id uuid references public.creneaux (id),
  score double precision check (score >= 0 and score <= 100),
  resume_ia text,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'envoyee', 'recue', 'examens', 'resultat', 'close', 'absente')),
  envoyee_le timestamptz,
  cree_le timestamptz not null default now()
);

-- ong : organisations qui financent.
create table if not exists public.ong (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  budget_total integer not null default 0 check (budget_total >= 0),
  budget_restant integer not null default 0 check (budget_restant >= 0),
  cree_le timestamptz not null default now()
);

-- regles_financement : critères de chaque ONG.
create table if not exists public.regles_financement (
  id uuid primary key default gen_random_uuid(),
  ong_id uuid not null references public.ong (id) on delete cascade,
  districts uuid[] not null check (cardinality(districts) >= 1),
  niveaux text[] not null,
  situations text[] not null,
  active boolean not null default true,
  cree_le timestamptz not null default now()
);

-- financements : demandes et accords de financement.
create table if not exists public.financements (
  id uuid primary key default gen_random_uuid(),
  orientation_id uuid not null references public.orientations (id) on delete cascade,
  ong_id uuid not null references public.ong (id),
  montant integer not null check (montant > 0),
  statut text not null default 'proposee' check (statut in ('proposee', 'confirmee', 'refusee', 'retiree')),
  raison_refus text,
  cree_le timestamptz not null default now()
);

-- suivis : historique des mises à jour faites par le centre.
create table if not exists public.suivis (
  id uuid primary key default gen_random_uuid(),
  orientation_id uuid not null references public.orientations (id) on delete cascade,
  etape text not null check (etape in ('recue', 'examens', 'resultat', 'absente')),
  resultat text not null check (resultat in ('en_attente', 'benin', 'a_surveiller', 'cancer_confirme')),
  note text,
  auteur_id uuid not null references public.profils (id),
  cree_le timestamptz not null default now()
);

-- Liens profils -> centres / ong.
alter table public.profils
  add constraint profils_centre_id_fk foreign key (centre_id) references public.centres (id) on delete set null;
alter table public.profils
  add constraint profils_ong_id_fk foreign key (ong_id) references public.ong (id) on delete set null;

-- =============================================================================
-- Fonctions utilitaires (security definer : contournent la RLS et évitent la
-- récursion quand une politique interroge la table profils).
-- =============================================================================

create or replace function public.utilisateur_role()
returns text language sql stable security definer set search_path = public as
$$ select role from public.profils where user_id = auth.uid() $$;

create or replace function public.utilisateur_profil_id()
returns uuid language sql stable security definer set search_path = public as
$$ select id from public.profils where user_id = auth.uid() $$;

create or replace function public.utilisateur_centre_id()
returns uuid language sql stable security definer set search_path = public as
$$ select centre_id from public.profils where user_id = auth.uid() $$;

create or replace function public.utilisateur_ong_id()
returns uuid language sql stable security definer set search_path = public as
$$ select ong_id from public.profils where user_id = auth.uid() $$;

-- =============================================================================
-- Vue cas_anonymes : seule source de données des ONG pour les cas.
-- Elle ne contient ni nom, ni téléphone, ni village, ni récit.
-- La vue est security definer et filtre selon l'appelant : l'ONG ne voit que
-- les cas avec une demande pour elle ; l'admin voit tout ; les autres rien.
-- =============================================================================

create or replace view public.cas_anonymes as
select
  f.id as financement_id,
  f.ong_id,
  f.montant,
  f.statut as statut_financement,
  p.code,
  p.age,
  d.nom as district,
  c.niveau_valide as niveau,
  p.capacite_paiement,
  ce.nom as centre,
  o.statut as statut_orientation,
  (
    select s.resultat from public.suivis s
    where s.orientation_id = o.id order by s.cree_le desc limit 1
  ) as resultat
from public.financements f
join public.orientations o on o.id = f.orientation_id
join public.consultations c on c.id = o.consultation_id
join public.patientes p on p.id = c.patiente_id
join public.districts d on d.id = p.district_id
join public.centres ce on ce.id = o.centre_id
where public.utilisateur_role() = 'admin' or f.ong_id = public.utilisateur_ong_id();

grant select on public.cas_anonymes to authenticated;

-- =============================================================================
-- Fonction confirmer_financement : une seule ONG obtient le cas (transaction).
-- La première ONG qui finance gagne ; les autres demandes passent à "retiree".
-- =============================================================================

create or replace function public.confirmer_financement(p_financement_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_orientation_id uuid;
  v_ong_id uuid;
  v_montant integer;
  v_statut text;
begin
  select orientation_id, ong_id, montant, statut
    into v_orientation_id, v_ong_id, v_montant, v_statut
    from public.financements where id = p_financement_id;

  if v_statut <> 'proposee' then
    raise exception 'Cette demande n''est plus disponible';
  end if;

  update public.ong
    set budget_restant = budget_restant - v_montant
    where id = v_ong_id and budget_restant >= v_montant;

  if not found then
    raise exception 'Budget insuffisant';
  end if;

  update public.financements set statut = 'confirmee' where id = p_financement_id;

  update public.financements set statut = 'retiree'
    where orientation_id = v_orientation_id
      and id <> p_financement_id
      and statut = 'proposee';
end;
$$;

-- =============================================================================
-- Trigger : une consultation ne peut être créée si patientes.consentement est faux.
-- =============================================================================

create or replace function public.verifier_consentement()
returns trigger language plpgsql as $$
declare
  v_consentement boolean;
begin
  select consentement into v_consentement from public.patientes where id = new.patiente_id;
  if v_consentement is distinct from true then
    raise exception 'Consentement requis pour créer une consultation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verifier_consentement on public.consultations;
create trigger trg_verifier_consentement
  before insert on public.consultations
  for each row execute function public.verifier_consentement();

-- =============================================================================
-- Row Level Security (section 11.1)
-- Sans politique explicite, aucun accès n'est possible.
-- =============================================================================

alter table public.profils enable row level security;
alter table public.districts enable row level security;
alter table public.centres enable row level security;
alter table public.creneaux enable row level security;
alter table public.tarifs enable row level security;
alter table public.patientes enable row level security;
alter table public.consultations enable row level security;
alter table public.orientations enable row level security;
alter table public.ong enable row level security;
alter table public.regles_financement enable row level security;
alter table public.financements enable row level security;
alter table public.suivis enable row level security;

drop policy if exists "profils_select" on public.profils;
create policy "profils_select" on public.profils for select
  using (public.utilisateur_role() = 'admin' or id = public.utilisateur_profil_id());

-- districts : lecture pour tout utilisateur authentifié.
drop policy if exists "districts_select" on public.districts;
create policy "districts_select" on public.districts for select to authenticated using (true);

-- centres : lecture pour tous ; modification pour le centre concerné ou l'admin.
drop policy if exists "centres_select" on public.centres;
create policy "centres_select" on public.centres for select to authenticated using (true);
drop policy if exists "centres_update" on public.centres;
create policy "centres_update" on public.centres for update
  using (public.utilisateur_role() = 'admin' or id = public.utilisateur_centre_id());

-- creneaux : lecture pour tous ; écriture pour le centre concerné ou l'admin.
drop policy if exists "creneaux_select" on public.creneaux;
create policy "creneaux_select" on public.creneaux for select to authenticated using (true);
drop policy if exists "creneaux_insert" on public.creneaux;
create policy "creneaux_insert" on public.creneaux for insert
  with check (public.utilisateur_role() = 'admin' or centre_id = public.utilisateur_centre_id());
drop policy if exists "creneaux_update" on public.creneaux;
create policy "creneaux_update" on public.creneaux for update
  using (public.utilisateur_role() = 'admin' or centre_id = public.utilisateur_centre_id());

-- tarifs : lecture pour tous ; écriture pour le centre concerné ou l'admin.
drop policy if exists "tarifs_select" on public.tarifs;
create policy "tarifs_select" on public.tarifs for select to authenticated using (true);
drop policy if exists "tarifs_update" on public.tarifs;
create policy "tarifs_update" on public.tarifs for update
  using (public.utilisateur_role() = 'admin' or centre_id = public.utilisateur_centre_id());

-- patientes : l'agent voit/crée/modifie les siennes ; le centre lit si une
-- orientation vers lui existe ; l'admin tout ; l'ONG rien.
drop policy if exists "patientes_select" on public.patientes;
create policy "patientes_select" on public.patientes for select using (
  public.utilisateur_role() = 'admin'
  or agent_id = public.utilisateur_profil_id()
  or exists (
    select 1 from public.consultations c
    join public.orientations o on o.consultation_id = c.id
    where c.patiente_id = patientes.id
      and o.centre_id = public.utilisateur_centre_id()
  )
);
drop policy if exists "patientes_insert" on public.patientes;
create policy "patientes_insert" on public.patientes for insert
  with check (public.utilisateur_role() = 'admin' or agent_id = public.utilisateur_profil_id());
drop policy if exists "patientes_update" on public.patientes;
create policy "patientes_update" on public.patientes for update
  using (public.utilisateur_role() = 'admin' or agent_id = public.utilisateur_profil_id());

-- consultations : mêmes règles que patientes.
drop policy if exists "consultations_select" on public.consultations;
create policy "consultations_select" on public.consultations for select using (
  public.utilisateur_role() = 'admin'
  or agent_id = public.utilisateur_profil_id()
  or exists (
    select 1 from public.orientations o
    where o.consultation_id = consultations.id
      and o.centre_id = public.utilisateur_centre_id()
  )
);
drop policy if exists "consultations_insert" on public.consultations;
create policy "consultations_insert" on public.consultations for insert
  with check (public.utilisateur_role() = 'admin' or agent_id = public.utilisateur_profil_id());
drop policy if exists "consultations_update" on public.consultations;
create policy "consultations_update" on public.consultations for update
  using (public.utilisateur_role() = 'admin' or agent_id = public.utilisateur_profil_id());

-- orientations : l'agent les siennes ; le centre lit/modifie le statut des siennes.
drop policy if exists "orientations_select" on public.orientations;
create policy "orientations_select" on public.orientations for select using (
  public.utilisateur_role() = 'admin'
  or centre_id = public.utilisateur_centre_id()
  or exists (
    select 1 from public.consultations c
    where c.id = orientations.consultation_id
      and c.agent_id = public.utilisateur_profil_id()
  )
);
drop policy if exists "orientations_insert" on public.orientations;
create policy "orientations_insert" on public.orientations for insert with check (
  public.utilisateur_role() = 'admin'
  or exists (
    select 1 from public.consultations c
    where c.id = orientations.consultation_id
      and c.agent_id = public.utilisateur_profil_id()
  )
);
drop policy if exists "orientations_update" on public.orientations;
create policy "orientations_update" on public.orientations for update using (
  public.utilisateur_role() = 'admin'
  or centre_id = public.utilisateur_centre_id()
  or exists (
    select 1 from public.consultations c
    where c.id = orientations.consultation_id
      and c.agent_id = public.utilisateur_profil_id()
  )
);

-- suivis : l'agent lit ceux de ses patientes ; le centre lit/crée pour son centre.
drop policy if exists "suivis_select" on public.suivis;
create policy "suivis_select" on public.suivis for select using (
  public.utilisateur_role() = 'admin'
  or exists (
    select 1 from public.orientations o
    join public.consultations c on c.id = o.consultation_id
    where o.id = suivis.orientation_id
      and (o.centre_id = public.utilisateur_centre_id()
           or c.agent_id = public.utilisateur_profil_id())
  )
);
drop policy if exists "suivis_insert" on public.suivis;
create policy "suivis_insert" on public.suivis for insert with check (
  public.utilisateur_role() = 'admin'
  or exists (
    select 1 from public.orientations o
    where o.id = suivis.orientation_id
      and o.centre_id = public.utilisateur_centre_id()
  )
);

-- ong : l'ONG lit la sienne ; l'admin tout.
drop policy if exists "ong_select" on public.ong;
create policy "ong_select" on public.ong for select
  using (public.utilisateur_role() = 'admin' or id = public.utilisateur_ong_id());

-- regles_financement : l'ONG gère les siennes ; l'admin tout.
drop policy if exists "regles_select" on public.regles_financement;
create policy "regles_select" on public.regles_financement for select
  using (public.utilisateur_role() = 'admin' or ong_id = public.utilisateur_ong_id());
drop policy if exists "regles_insert" on public.regles_financement;
create policy "regles_insert" on public.regles_financement for insert
  with check (public.utilisateur_role() = 'admin' or ong_id = public.utilisateur_ong_id());
drop policy if exists "regles_update" on public.regles_financement;
create policy "regles_update" on public.regles_financement for update
  using (public.utilisateur_role() = 'admin' or ong_id = public.utilisateur_ong_id());

-- financements : l'agent lit ceux de ses patientes ; le centre ceux de son centre ;
-- l'ONG lit/modifie les siens ; l'admin tout.
drop policy if exists "financements_select" on public.financements;
create policy "financements_select" on public.financements for select using (
  public.utilisateur_role() = 'admin'
  or ong_id = public.utilisateur_ong_id()
  or exists (
    select 1 from public.orientations o
    join public.consultations c on c.id = o.consultation_id
    where o.id = financements.orientation_id
      and (o.centre_id = public.utilisateur_centre_id()
           or c.agent_id = public.utilisateur_profil_id())
  )
);
drop policy if exists "financements_update" on public.financements;
create policy "financements_update" on public.financements for update
  using (public.utilisateur_role() = 'admin' or ong_id = public.utilisateur_ong_id());
