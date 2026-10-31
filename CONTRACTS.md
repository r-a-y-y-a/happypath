# Shared contracts

Workers build against this file and `supabase/schema.sql`.
Changing either one needs the lead's approval.

## Auth
The browser signs in with Supabase auth.
Judges and friends use anonymous sign-in, then create their profile with `PUT /api/profiles/me`.
The demo personas (Maya, Jun, Priya, Daniel) are real auth users with password `happypath-demo`.
Their emails are `maya@happypath.demo`, `jun@happypath.demo`, `priya@happypath.demo` and `daniel@happypath.demo`.
The app has a "Demo login" button that signs in as Maya.

## API
Base path is `/api`.
All bodies are JSON.
Writes need `Authorization: Bearer <supabase access token>`.
Reads work without a token.
The server builds a Supabase client with the anon key and forwards the caller's token, so row level security does the permission checks.
The server never needs the service-role key.
Errors are `{ "error": "message" }` with a 4xx or 5xx status.

| Method and path | Body | Returns |
|---|---|---|
| GET `/api/health` | | `{ ok, supabase }` |
| PUT `/api/profiles/me` | `{ display_name, avatar_url?, bio? }` | profile |
| GET `/api/profiles/:id` | | profile |
| GET `/api/profiles/:id/diary` | | `{ profile, posts: Post[] }`, newest first |
| GET `/api/profiles/:id/days` | | Day[], the person's most recent days (up to 6), newest first |
| GET `/api/places?q=` | | `{ name, address, lat, lng }[]`, up to 6 matches in Singapore for the venue search box |
| GET `/api/travel?from=&to=&depart=&fromLat=&fromLng=&toLat=&toLng=` | | `{ from, to, options: Option[], error? }`, venues are free text in Singapore, `depart` is an ISO time, options are fastest first, `shuttle: { routes, every_min: [min, max], note }` is added when both stops are on the NUS Kent Ridge campus |
| GET `/api/friends` | | `(Profile & { latest_day: { id, title, date, stops: { emoji, title }[] } \| null })[]`, most recently active first |
| POST `/api/friends/:id` | | `{ ok: true }`, adds the friendship in both directions. Joining someone's day by link also befriends the day owner |
| GET `/api/days/current` | | the caller's most recent day, as a Day, or 404 |
| GET `/api/days/:id` | | Day |
| POST `/api/days` | `{ title, date }` | Day, owner is added as a member |
| POST `/api/days/:id/join` | | `{ ok: true }`, adds the caller to the day and every node in it |
| POST `/api/days/:id/nodes` | `{ title, venue?, lat?, lng?, emoji?, starts_at, ends_at }` | Node, every current day member is added to it |
| POST `/api/nodes/:id/join` | | `{ ok: true }` |
| POST `/api/posts` | `{ node_id, photo_path, caption?, created_at? }` | Post, `created_at` is the demo clock time when the clock was jumped |
| POST `/api/posts/:id/like` | | `{ liked, like_count }`, toggles |
| GET `/api/posts/:id/comments` | | Comment[], oldest first |
| POST `/api/posts/:id/comments` | `{ body }` | Comment |

## Shapes
```
Profile  { id, display_name, avatar_url, bio }
Day      { id, title, date, owner: Profile, members: Profile[], nodes: Node[] }   nodes sorted by starts_at
Node     { id, day_id, title, venue, emoji, starts_at, ends_at, members: Profile[], post_count }
Post     { id, node: { id, title, venue, emoji, starts_at, ends_at }, author: Profile, photo_url, caption, created_at, like_count, liked_by_me, comment_count }
Comment  { id, post_id, author: Profile, body, created_at }
```

## Photos
The browser uploads the file to the Supabase Storage bucket `posts` at `<user id>/<timestamp>.jpg`, resized to about 1280px wide.
It then calls `POST /api/posts` with that path as `photo_path`.
`photo_url` in responses is the public URL.
If `photo_path` starts with `http`, it is used as is, which is how seed photos work.

## Posting window
A node accepts a photo from `starts_at` until 30 minutes after `ends_at`.
The check runs in the browser only, against the demo clock, so the server does not enforce it.

## Realtime
The browser subscribes to Postgres changes on `posts`, `comments`, `likes`, `nodes` and `day_members` directly with the anon key.
The same tables are public to read.

## Design tokens
Defined in `src/index.css` under `@theme`.
Display font is Fraunces and body font is Plus Jakarta Sans, loaded in `index.html`.
Mobile first, and the layout is designed at 390px wide.
