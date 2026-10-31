#!/usr/bin/env bash
# Smoke test: anonymous sign-in, then walk the main API path. Needs the API running (PORT=3102 node --env-file=.env server.js).
set -eu
set -a; . "$(dirname "$0")/../.env"; set +a
API="${API:-http://localhost:${PORT:-3102}}"
show() { echo "== $1"; echo "$2"; echo; }

AUTH=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" -H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json' -d '{}')
TOKEN=$(echo "$AUTH" | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token')
H=(-H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json')
id() { node -pe 'JSON.parse(require("fs").readFileSync(0)).id'; }

show health "$(curl -sf "$API/api/health")"
show "PUT profile" "$(curl -sf -X PUT "$API/api/profiles/me" "${H[@]}" -d '{"display_name":"Smoke Tester","bio":"hi"}')"
PROFILE=$(echo "$AUTH" | node -pe 'JSON.parse(require("fs").readFileSync(0)).user.id')
DAY=$(curl -sf -X POST "$API/api/days" "${H[@]}" -d '{"title":"Smoke day","date":"2026-10-31"}')
show "POST day" "$DAY"; DAY_ID=$(echo "$DAY" | id)
show "GET current day" "$(curl -sf "$API/api/days/current" "${H[@]}")"
NODE=$(curl -sf -X POST "$API/api/days/$DAY_ID/nodes" "${H[@]}" -d '{"title":"Sunset","venue":"Barrage","emoji":"x","starts_at":"2026-10-31T10:00:00Z","ends_at":"2026-10-31T11:30:00Z"}')
show "POST node" "$NODE"; NODE_ID=$(echo "$NODE" | id)
show "join day" "$(curl -sf -X POST "$API/api/days/$DAY_ID/join" "${H[@]}")"
show "join node" "$(curl -sf -X POST "$API/api/nodes/$NODE_ID/join" "${H[@]}")"
POST=$(curl -sf -X POST "$API/api/posts" "${H[@]}" -d "{\"node_id\":\"$NODE_ID\",\"photo_path\":\"https://picsum.photos/600\",\"caption\":\"golden hour\"}")
show "POST post" "$POST"; POST_ID=$(echo "$POST" | id)
show "like" "$(curl -sf -X POST "$API/api/posts/$POST_ID/like" "${H[@]}")"
show "comment" "$(curl -sf -X POST "$API/api/posts/$POST_ID/comments" "${H[@]}" -d '{"body":"nice!"}')"
show "GET comments" "$(curl -sf "$API/api/posts/$POST_ID/comments")"
show "GET diary" "$(curl -sf "$API/api/profiles/$PROFILE/diary" "${H[@]}")"
show "GET day" "$(curl -sf "$API/api/days/$DAY_ID")"
show "unauth write is 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/days" -H 'Content-Type: application/json' -d '{}')"
echo "smoke ok"
