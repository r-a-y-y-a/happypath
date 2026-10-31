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
| OneMap (SLA) | API token (free to register) | $0 per the author and a third-party write-up, official terms not verified | Terms and token expiry were not readable from the docs page, so check them before any production use. | https://www.onemap.gov.sg/apidocs/ |

Going beyond a demo means leaving Vercel Hobby for Pro ($20/mo per the same page) because Hobby forbids commercial use, and moving Supabase off the Free plan if the project must not pause.

## Before and after

**Before:** a group posts its moment in BeReal, where "at a random time, everyone gets the same two-minute window to take and share a photo" (BeReal's App Store description, https://apps.apple.com/us/app/bereal-your-friends-for-real/id1459645446).
The plan itself lives somewhere else, and people switch to Google Maps to find the venue and work out how to get from stop to stop.
**After:** happypath does both in one place.
A day is a chain of stops, each stop has real places and MRT, bus and walking travel times to the next, and the photo prompt opens at the stop the group planned instead of at a random time, so every photo lands on a diary tied to the plan.

For a person using the apps, the cost before is already low: the BeReal App Store listing shows "Free" and lists no in-app purchases on the page we read.
BeReal+ pricing and Google Maps consumer pricing could not be confirmed from official pages, so we make no cost claim about them.
The improvement for users is one app instead of three and a prompt that is tied to the plan, not a lower price.

The part of this with a published price for a builder is the maps work, so that is the like-for-like cost comparison.
Building the same place search, place details and routing on Google Maps Platform instead of OneMap and OpenStreetMap would be billed per request.
Prices are USD per 1,000 billable events, from https://developers.google.com/maps/billing-and-pricing/pricing (last updated 2026-10-30, read 2026-10-31).

| Google Maps Platform SKU | Free per month | Then per 1,000 |
| --- | --- | --- |
| Places Autocomplete requests | 10,000 | $2.83 |
| Place Details Essentials | 10,000 | $5.00 |
| Routes: Compute Routes Essentials | 10,000 | $5.00 |

Worked example, using an illustrative workload of 100,000 requests a month for each of the three SKUs:

- Autocomplete: 90,000 billable at $2.83 per 1,000 is $254.70.
- Place Details: 90,000 billable at $5.00 per 1,000 is $450.00.
- Compute Routes Essentials: 90,000 billable at $5.00 per 1,000 is $450.00.
- Total: **$1,154.70 per month**, against $0 per month for the same workload's hosting on the free tiers above, so long as it stays within their limits.

At or below 10,000 requests per SKU a month, Google would also be $0, so the saving only appears as usage grows.
The "after" figure covers hosting and place data only.
OneMap is described as free for mapping within Singapore, with a token you register for (https://sheshbabu.com/posts/exploring-singapore-onemap-api, a third-party write-up), but its official terms page was not readable on 2026-10-31, so check them before relying on this.
This comparison does not price BeReal+ or the consumer Google Maps app, because we could not read an official price for either.

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
