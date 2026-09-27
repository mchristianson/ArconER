-- ArconEr Cup schema. Teams are keyed 'arcon' and '838' (838 was "ER Systems" through 2011; display name lives on tournaments.team2_name).

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- canonical nickname used everywhere ("Skinny", "PKO")
  full_name text,
  bio text,
  photo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  player_id uuid references players on delete set null,
  role text not null default 'pending' check (role in ('pending', 'member', 'admin')),
  created_at timestamptz not null default now()
);

create table tournaments (
  year int primary key,
  start_date date,
  end_date date,
  lodging text,
  lodging_address text,
  courses text,
  notes text,
  winner text check (winner in ('arcon', '838', 'tie')),
  arcon_points numeric,
  team2_points numeric,
  team2_name text not null default '838 Coatings',
  gamebook_url text
);

create table roster (
  year int not null references tournaments on delete cascade,
  player_id uuid not null references players on delete cascade,
  team text not null check (team in ('arcon', '838')),
  is_captain boolean not null default false,
  primary key (year, player_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  year int not null references tournaments on delete cascade,
  label text not null,                -- 'Thursday', 'Morning', 'Singles'
  format text not null,               -- '4-ball', '2-man scramble', 'singles'
  sort int not null default 0
);

-- Result strings are kept as recorded ('1 UP', '3 & 1', 'AS'); the side that won a segment holds the string.
create table matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  sort int not null default 0,
  arcon_front text, arcon_back text, arcon_total text,
  team2_front text, team2_back text, team2_total text,
  arcon_pts numeric not null default 0,
  team2_pts numeric not null default 0
);

create table match_players (
  match_id uuid not null references matches on delete cascade,
  player_id uuid not null references players on delete cascade,
  team text not null check (team in ('arcon', '838')),
  primary key (match_id, player_id)
);

create table schedule_items (
  id uuid primary key default gen_random_uuid(),
  year int not null references tournaments on delete cascade,
  starts_at timestamptz not null,
  title text not null,
  location text,
  details text
);

create table rsvps (
  year int not null references tournaments on delete cascade,
  player_id uuid not null references players on delete cascade,
  status text not null check (status in ('in', 'out', 'maybe')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (year, player_id)
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  year int not null references tournaments on delete cascade,
  storage_path text not null unique,
  taken_at timestamptz,
  caption text,
  width int,
  height int,
  uploaded_by uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table photo_tags (
  photo_id uuid not null references photos on delete cascade,
  player_id uuid not null references players on delete cascade,
  primary key (photo_id, player_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  year int not null references tournaments on delete cascade,
  photo_id uuid references photos on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  author uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table edit_suggestions (
  id uuid primary key default gen_random_uuid(),
  year int not null references tournaments on delete cascade,
  field text not null,                -- 'winner', 'lodging', 'roster', 'notes', ...
  proposed_value text not null,
  reason text,
  author uuid not null default auth.uid() references profiles on delete cascade,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected')),
  reviewed_by uuid references profiles,
  created_at timestamptz not null default now()
);

create index on roster (player_id);
create index on sessions (year);
create index on matches (session_id);
create index on match_players (player_id);
create index on schedule_items (year);
create index on photos (year);
create index on photos (uploaded_by);
create index on photo_tags (player_id);
create index on comments (year);
create index on comments (photo_id);
create index on comments (author);
create index on edit_suggestions (year);
create index on edit_suggestions (author);
create index on edit_suggestions (reviewed_by);
create index on profiles (player_id);

-- Role helpers -------------------------------------------------------------

create function is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create function is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('member', 'admin'));
$$;

create function my_player_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select player_id from public.profiles where id = (select auth.uid());
$$;

-- New sign-ins get a pending profile; the founding admin is recognized by email.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    case when new.email = 'christianson.matt@gmail.com' then 'admin' else 'pending' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Emails stay in auth.users; only admins can see them.
create function admin_users()
returns table (id uuid, email text, display_name text, avatar_url text, role text, player_id uuid, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, u.email::text, p.display_name, p.avatar_url, p.role, p.player_id, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

revoke execute on function admin_users() from public, anon;
revoke execute on function handle_new_user() from public, anon, authenticated;

-- Career stats --------------------------------------------------------------

create view player_career with (security_invoker = true) as
with results as (
  select mp.player_id,
         case when mp.team = 'arcon' then m.arcon_pts else m.team2_pts end as pts,
         sign(case when mp.team = 'arcon' then m.arcon_pts - m.team2_pts else m.team2_pts - m.arcon_pts end) as outcome
  from match_players mp join matches m on m.id = mp.match_id
)
select p.id as player_id, p.name,
  (select count(*) from roster r where r.player_id = p.id) as years_played,
  (select min(year) from roster r where r.player_id = p.id) as first_year,
  (select max(year) from roster r where r.player_id = p.id) as last_year,
  coalesce(sum(res.pts), 0) as points,
  count(*) filter (where res.outcome > 0) as wins,
  count(*) filter (where res.outcome < 0) as losses,
  count(*) filter (where res.outcome = 0) as halves
from players p left join results res on res.player_id = p.id
group by p.id, p.name;

-- RLS -----------------------------------------------------------------------

alter table players enable row level security;
alter table profiles enable row level security;
alter table tournaments enable row level security;
alter table roster enable row level security;
alter table sessions enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table schedule_items enable row level security;
alter table rsvps enable row level security;
alter table photos enable row level security;
alter table photo_tags enable row level security;
alter table comments enable row level security;
alter table edit_suggestions enable row level security;

-- Everything is publicly readable.
do $$
declare t text;
begin
  foreach t in array array['players','profiles','tournaments','roster','sessions','matches','match_players',
                           'schedule_items','rsvps','photos','photo_tags','comments','edit_suggestions'] loop
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
  -- Admin-managed tables.
  foreach t in array array['players','tournaments','roster','sessions','matches','match_players','schedule_items'] loop
    execute format('create policy "admin insert" on %I for insert to authenticated with check ((select is_admin()))', t);
    execute format('create policy "admin update" on %I for update to authenticated using ((select is_admin()))', t);
    execute format('create policy "admin delete" on %I for delete to authenticated using ((select is_admin()))', t);
  end loop;
end $$;

create policy "admin update" on profiles for update to authenticated using ((select is_admin()));

create policy "member insert" on photos for insert to authenticated
  with check ((select is_member()) and uploaded_by = (select auth.uid()));
create policy "owner or admin update" on photos for update to authenticated
  using (uploaded_by = (select auth.uid()) or (select is_admin()));
create policy "owner or admin delete" on photos for delete to authenticated
  using (uploaded_by = (select auth.uid()) or (select is_admin()));

create policy "member insert" on photo_tags for insert to authenticated with check ((select is_member()));
create policy "member delete" on photo_tags for delete to authenticated using ((select is_member()));

create policy "member insert" on comments for insert to authenticated
  with check ((select is_member()) and author = (select auth.uid()));
create policy "owner update" on comments for update to authenticated using (author = (select auth.uid()));
create policy "owner or admin delete" on comments for delete to authenticated
  using (author = (select auth.uid()) or (select is_admin()));

create policy "member insert" on edit_suggestions for insert to authenticated
  with check ((select is_member()) and author = (select auth.uid()));
create policy "admin update" on edit_suggestions for update to authenticated using ((select is_admin()));
create policy "admin delete" on edit_suggestions for delete to authenticated using ((select is_admin()));

create policy "own insert" on rsvps for insert to authenticated
  with check ((select is_member()) and (player_id = (select my_player_id()) or (select is_admin())));
create policy "own update" on rsvps for update to authenticated
  using (player_id = (select my_player_id()) or (select is_admin()));
create policy "own delete" on rsvps for delete to authenticated
  using (player_id = (select my_player_id()) or (select is_admin()));

-- Storage -------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

create policy "member upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (select public.is_member()));
create policy "owner or admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (owner = (select auth.uid()) or (select public.is_admin())));
