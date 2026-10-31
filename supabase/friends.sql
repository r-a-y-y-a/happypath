-- Friend list and stop coordinates. Paste into the Supabase SQL editor and run.
-- Friendships are stored as two rows, one per direction, so "my friends" is a single filter.
create table if not exists friendships (
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friendships_friend_idx on friendships (friend_id);
-- Hackathon demo: RLS is off on the app tables, so this one is open too.
alter table friendships disable row level security;

-- Coordinates for stops picked from the place search, used for exact travel times.
alter table nodes add column if not exists lat double precision;
alter table nodes add column if not exists lng double precision;
