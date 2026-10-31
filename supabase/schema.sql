-- happypath schema. Paste into the Supabase SQL editor. Safe to re-run.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists days (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists day_members (
  day_id uuid not null references days(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (day_id, user_id)
);

create table if not exists nodes (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references days(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  venue text,
  emoji text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists node_members (
  node_id uuid not null references nodes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (node_id, user_id)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references nodes(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  photo_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Row level security: everything is publicly readable, writes are own-rows only.
alter table profiles enable row level security;
alter table days enable row level security;
alter table day_members enable row level security;
alter table nodes enable row level security;
alter table node_members enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','days','day_members','nodes','node_members','posts','likes','comments'] loop
    execute format('drop policy if exists "read all" on %I', t);
    execute format('create policy "read all" on %I for select using (true)', t);
  end loop;
end $$;

drop policy if exists "own profile insert" on profiles;
create policy "own profile insert" on profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update to authenticated using (id = auth.uid());

drop policy if exists "own day insert" on days;
create policy "own day insert" on days for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "self join day" on day_members;
create policy "self join day" on day_members for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "member node insert" on nodes;
create policy "member node insert" on nodes for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from day_members m where m.day_id = nodes.day_id and m.user_id = auth.uid())
);

drop policy if exists "self join node" on node_members;
create policy "self join node" on node_members for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "own post insert" on posts;
create policy "own post insert" on posts for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "own like insert" on likes;
create policy "own like insert" on likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own like delete" on likes;
create policy "own like delete" on likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "own comment insert" on comments;
create policy "own comment insert" on comments for insert to authenticated with check (author_id = auth.uid());

-- Realtime for the live moments in the demo.
do $$
declare t text;
begin
  foreach t in array array['posts','comments','likes','nodes','day_members','node_members'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Photo storage: public bucket, any signed-in user (anonymous included) can upload.
insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing;
drop policy if exists "posts upload" on storage.objects;
create policy "posts upload" on storage.objects for insert to authenticated with check (bucket_id = 'posts');
drop policy if exists "posts read" on storage.objects;
create policy "posts read" on storage.objects for select using (bucket_id = 'posts');
