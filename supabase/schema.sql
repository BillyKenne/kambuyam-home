-- Kambuyam Home : schéma de la base de données (Supabase / PostgreSQL)
-- À coller une seule fois dans Supabase > SQL Editor > New query > Run.
-- Ré-exécutable : les objets existants sont remplacés ou ignorés.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------
-- Profils (un par compte). Rôles : client, owner (propriétaire), admin.
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text not null default '',
  role        text not null default 'client' check (role in ('client','owner','admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Création automatique du profil à l'inscription. Le rôle demandé ne peut être que client ou owner.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when new.raw_user_meta_data->>'role' = 'owner' then 'owner' else 'client' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un utilisateur ne peut pas changer son propre rôle en admin (seul un admin le peut).
-- Il peut passer de client à propriétaire.
create or replace function public.guard_profile_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated','anon') and new.role is distinct from old.role and not public.is_admin() then
    if not (old.role = 'client' and new.role = 'owner') then
      raise exception 'Changement de rôle non autorisé';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------
-- Annonces
-- ---------------------------------------------------------------
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  partner     text,                       -- ex. « Résidence Soft Time »
  title       text not null check (char_length(title) between 3 and 100),
  type        text not null check (type in ('Appartement meublé','Chambre / studio','Appartement','Maison','Terrain')),
  city        text not null check (city in ('Douala','Yaoundé')),
  area        text not null default '',
  mode        text not null check (mode in ('nuit','mois','vente')),
  price       integer not null check (price > 0),
  description text not null default '',
  amenities   text[] not null default '{}',
  photos      text[] not null default '{}',  -- URLs publiques
  status      text not null default 'pending' check (status in ('pending','published','rejected','archived')),
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists listings_search on public.listings (status, city, mode, price);

-- Toute modification par un non-admin repasse l'annonce « en attente » de validation.
create or replace function public.guard_listing() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  -- Les règles s'appliquent aux visiteurs du site ; l'éditeur SQL de Supabase (admin technique) n'est pas limité.
  if current_user in ('authenticated','anon') and not public.is_admin() then
    new.featured := coalesce(old.featured, false);
    if tg_op = 'INSERT' then
      new.status := 'pending';
    elsif new.status = 'archived' and old.status <> 'archived' then
      null; -- le propriétaire peut retirer son annonce
    else
      new.status := 'pending';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_listing on public.listings;
create trigger guard_listing before insert or update on public.listings
  for each row execute function public.guard_listing();

-- ---------------------------------------------------------------
-- Réservations (séjours à la nuit) et demandes de visite (location au mois / vente)
-- ---------------------------------------------------------------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique default ('KBY-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  kind           text not null default 'stay' check (kind in ('stay','visit')),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  client_id      uuid not null references public.profiles(id) on delete cascade,
  check_in       date not null,
  check_out      date,
  guests         integer not null default 1 check (guests between 1 and 20),
  nights         integer not null default 0,
  total          integer not null default 0,
  commission     integer not null default 0,   -- 3 % pour Kambuyam
  contact_phone  text not null default '',
  message        text not null default '',
  payment_method text check (payment_method in ('orange_money','mtn_momo')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','simulated','paid','refunded')),
  status         text not null default 'requested' check (status in ('requested','confirmed','declined','cancelled','completed')),
  created_at     timestamptz not null default now(),
  constraint stay_dates check (kind = 'visit' or (check_out is not null and check_out > check_in)),
  -- Pas deux réservations confirmées qui se chevauchent sur le même logement.
  constraint no_overlap exclude using gist (
    listing_id with =,
    daterange(check_in, coalesce(check_out, check_in + 1), '[)') with &&
  ) where (kind = 'stay' and status in ('confirmed','completed'))
);
create index if not exists bookings_client on public.bookings (client_id);
create index if not exists bookings_listing on public.bookings (listing_id);

-- Dates déjà prises (visible par tous, sans dévoiler qui a réservé).
create or replace function public.taken_dates(p_listing uuid)
returns table (check_in date, check_out date)
language sql stable security definer set search_path = public as $$
  select check_in, check_out from public.bookings
  where listing_id = p_listing and kind = 'stay' and status in ('confirmed','completed') and check_out >= current_date;
$$;


-- Calcul du prix côté serveur (le navigateur ne peut pas tricher sur le montant)
-- et contrôle de qui peut changer quoi.
create or replace function public.guard_booking() returns trigger
language plpgsql set search_path = public as $$
declare l public.listings; is_owner boolean;
begin
  if current_user not in ('authenticated','anon') then return new; end if;
  select * into l from public.listings where id = new.listing_id;
  if l.id is null and tg_op = 'INSERT' then raise exception 'Annonce introuvable'; end if;
  if tg_op = 'INSERT' then
    if l.status <> 'published' then raise exception 'Annonce non disponible'; end if;
    new.client_id := auth.uid();
    new.status := 'requested';
    if new.payment_status not in ('unpaid','simulated') then new.payment_status := 'unpaid'; end if;
    if l.mode = 'nuit' then
      new.kind := 'stay';
      if new.check_in < current_date then raise exception 'Date d''arrivée passée'; end if;
      if new.check_out is null or new.check_out <= new.check_in then raise exception 'Dates invalides'; end if;
      if exists (select 1 from public.taken_dates(new.listing_id) t
                 where daterange(t.check_in, t.check_out, '[)') && daterange(new.check_in, new.check_out, '[)')) then
        raise exception 'Ces dates ne sont plus disponibles';
      end if;
      new.nights := new.check_out - new.check_in;
      new.total := l.price * new.nights;
    else
      new.kind := 'visit'; new.check_out := null; new.nights := 0; new.total := 0;
    end if;
    new.commission := round(new.total * 0.03);
    return new;
  end if;

  -- UPDATE : seuls le statut (et le paiement pour l'admin) peuvent changer.
  if not public.is_admin() then
    is_owner := l.owner_id = auth.uid();
    if new.listing_id <> old.listing_id or new.client_id <> old.client_id or new.check_in <> old.check_in
       or new.check_out is distinct from old.check_out or new.total <> old.total or new.commission <> old.commission
       or new.payment_status <> old.payment_status then
      raise exception 'Modification non autorisée';
    end if;
    if new.status <> old.status then
      if is_owner and old.status = 'requested' and new.status in ('confirmed','declined') then null;
      elsif is_owner and old.status = 'confirmed' and new.status in ('completed','cancelled') then null;
      elsif old.client_id = auth.uid() and old.status in ('requested','confirmed') and new.status = 'cancelled' then null;
      else raise exception 'Changement de statut non autorisé';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_booking on public.bookings;
create trigger guard_booking before insert or update on public.bookings
  for each row execute function public.guard_booking();

-- Le propriétaire voit les coordonnées de ses clients ; vue pratique pour les tableaux de bord.
create or replace view public.booking_details with (security_invoker = true) as
  select b.*, l.title as listing_title, l.city, l.area, l.owner_id, l.mode,
         c.full_name as client_name, c.phone as client_phone
  from public.bookings b
  left join public.listings l on l.id = b.listing_id
  left join public.profiles c on c.id = b.client_id;

-- ---------------------------------------------------------------
-- Sécurité ligne par ligne (RLS)
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "profil: lire" on public.profiles;
create policy "profil: lire" on public.profiles for select using (
  id = auth.uid() or public.is_admin()
  or exists (  -- un propriétaire voit le profil des clients qui ont réservé chez lui
    select 1 from public.bookings b join public.listings l on l.id = b.listing_id
    where b.client_id = profiles.id and l.owner_id = auth.uid())
);
drop policy if exists "profil: modifier" on public.profiles;
create policy "profil: modifier" on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "annonces: lire" on public.listings;
create policy "annonces: lire" on public.listings for select
  using (status = 'published' or owner_id = auth.uid() or public.is_admin());
drop policy if exists "annonces: créer" on public.listings;
create policy "annonces: créer" on public.listings for insert
  with check (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin')));
drop policy if exists "annonces: modifier" on public.listings;
create policy "annonces: modifier" on public.listings for update
  using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
drop policy if exists "annonces: supprimer" on public.listings;
create policy "annonces: supprimer" on public.listings for delete using (public.is_admin());

drop policy if exists "réservations: lire" on public.bookings;
create policy "réservations: lire" on public.bookings for select using (
  client_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
);
drop policy if exists "réservations: créer" on public.bookings;
create policy "réservations: créer" on public.bookings for insert with check (auth.uid() is not null);
drop policy if exists "réservations: modifier" on public.bookings;
create policy "réservations: modifier" on public.bookings for update using (
  client_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
);



-- ---------------------------------------------------------------
-- Photos : stockage public en lecture, chaque compte écrit dans son dossier.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;

drop policy if exists "photos: lire" on storage.objects;
create policy "photos: lire" on storage.objects for select using (bucket_id = 'photos');
drop policy if exists "photos: envoyer" on storage.objects;
create policy "photos: envoyer" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos: supprimer" on storage.objects;
create policy "photos: supprimer" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
