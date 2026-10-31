-- Hackathon demo: turn RLS off on the app tables. Paste into the Supabase SQL editor and run.
-- The storage policies on storage.objects stay, since uploads from signed-in users still need them.
alter table profiles disable row level security;
alter table days disable row level security;
alter table day_members disable row level security;
alter table nodes disable row level security;
alter table node_members disable row level security;
alter table posts disable row level security;
alter table likes disable row level security;
alter table comments disable row level security;
