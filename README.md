# happypath

A social app for planning your day with friends and catching the real moment.
Friends chain a day into stops, invite each other by link or QR code, and when a stop is on, everyone gets a prompt to post one photo.
Photos land on a public diary profile that friends can like and comment on.

Live demo: https://happypath-theta.vercel.app (tap "Demo login as Maya").

## Demo script (under 3 minutes)

1. Open the day "Saturday in the city". It already has stops, friends and posted photos.
2. Tap "Add a stop", search a real place in Singapore, and add it. It slides into the timeline.
3. Tap "Invite friends" to show the QR code. A second phone scans it, picks a name and joins the day.
4. Tap the logo five times to open the demo clock and jump to a stop. The "Happening now - post your moment" banner drops on both phones.
5. The second phone posts a photo. It appears on Maya's diary live.
6. Open Friends and tap a friend to see their own trip, then their diary.

## Features

- Days made of stops, shared with a whole day or with single stops.
- A photo window for each stop (the stop's time plus 30 minutes), with an in-app banner.
- Public diary profiles with likes and comments, updated live over Supabase Realtime.
- A small friends list. Joining someone's day by link makes you friends.
- Place search and travel times between stops using Singapore's OneMap, including MRT and bus journeys.
- Published NUS shuttle frequency between stops on the Kent Ridge campus.
- A demo clock that is shared across phones, so the demo never depends on the real time.

## Run it

Requires Node.js 20.6 or later and a Supabase project.

```sh
npm install
cp .env.example .env        # fill in the keys
# In the Supabase SQL editor run, in order: supabase/schema.sql, supabase/friends.sql, supabase/disable-rls.sql
npm run seed                # creates the demo users, days, trips and photos
npm run dev:api             # API on http://localhost:3001
npm run dev                 # app on http://localhost:5173, proxies /api to the API
```

`VITE_MOCK=1 npm run dev` runs the UI with hardcoded data and no backend.
`npm run seed` also resets the demo, so run it after any rehearsal.
`supabase/disable-rls.sql` turns row level security off, which is only acceptable for a hackathon demo with fake data.

## Stack

React 18, Vite, Tailwind CSS 4, Framer Motion, Express, and Supabase (Postgres, Auth, Storage, Realtime).
It deploys to Vercel as a static app plus one serverless function pinned to `sin1`.

## Running costs

All prices below were read from the vendors' pages on 2026-10-31.
Running the demo costs $0 per month on the free tiers.

| Service | Plan | Price | Limits that matter here | Source |
| --- | --- | --- | --- | --- |
| Vercel | Hobby | $0/mo | 1M function invocations, 100 GB fast data transfer per month. Personal, non-commercial use only. | https://vercel.com/pricing |
| Supabase | Free | $0/mo | 500 MB database, 1 GB file storage, 50,000 monthly active users, 200 concurrent Realtime connections, 2M Realtime messages per month. Projects pause after 1 week of inactivity. | https://supabase.com/pricing |
| OneMap (SLA) | Developer token | Not verified | Terms and token expiry were not readable from the docs page, so check them before any production use. | https://www.onemap.gov.sg/apidocs/ |

Going beyond a demo means leaving Vercel Hobby for Pro ($20/mo per the same page) because Hobby forbids commercial use, and moving Supabase off the Free plan if the project must not pause.

## Data, assets and licences

- happypath is released under the MIT licence (see `LICENSE`).
- Dependencies are MIT, ISC, BSD, Apache-2.0 and 0BSD, plus MPL-2.0 for `lightningcss` and CC-BY-4.0 for the `caniuse-lite` data. Both are used unmodified as build tooling, which is compatible with MIT. Run `npm ls` and check `package-lock.json` for the full list.
- Demo photos are from Unsplash and used under the Unsplash License (https://unsplash.com/license).
- Place search and routing use OneMap from the Singapore Land Authority. Place data from OpenStreetMap is under the ODbL, copyright OpenStreetMap contributors. OpenStreetMap's Nominatim is only queried when a person presses Enter, never as they type, to follow its usage policy (https://operations.osmfoundation.org/policies/nominatim/).
- NUS shuttle headways come from NUS's published "Frequency Range" notice (Campus Life, September 2023). No NUS API or credentials are used.
- The demo people (Maya, Jun, Priya, Daniel) are fictional.
- No secrets are committed. `.env` is git-ignored, and the Supabase service role key is only ever used locally by the seed script.

## Built at the hackathon

All code in this repository was written during the sprint on 2026-10-31, and the commit history shows it.
No proprietary code, assets, firmware or trademarks were copied.
