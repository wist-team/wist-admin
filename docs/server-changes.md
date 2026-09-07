# Server changes for the admin app

Two server-side changes fall out of `PLAN.md`. Neither blocks Release 1: the guard ignores unknown headers, so the app can send its key before anything checks it. Both are performed by Harry (box access, SAM deploys); this file is the prepared work.

## 1. Admin API behind `authGuard` (box: `adminapi.js`)

Background and box procedures: `~/Developer/Node/API_AUTH_HANDOVER.md` §2–§3. The box copy of `adminapi.js` has drifted from git (22.07 KiB vs 17.28 KiB), so **download the box copy and patch that**, never the repo copy.

### Step 1 — register the key (no restart needed yet)

The admin app's key is in the local `.env` of this repo and already on EAS (`EXPO_PUBLIC_WIST_ADMIN_KEY`, environments `preview` and `production`, visibility sensitive). Append it to `WIST_API_KEYS` in `/home/ec2-user/syft_api/.env`, comma-separated, named `admin-app`:

```text
WIST_API_KEYS=lambda-dev:<k1>,lambda-prod:<k2>,admin-app:<admin key>
```

Store the key in the team password manager under "Wist Admin app key".

### Step 2 — pull the box copy into git

There is no SSH route from Harry's Mac; use Webmin's File Manager to download `/home/ec2-user/syft_api/adminapi.js` to `~/Downloads/adminapi.js`, then:

```bash
cp ~/Downloads/adminapi.js ~/Developer/Node/adminapi.js
cd ~/Developer/Node && git diff --stat && git commit -am "adminapi.js: import box copy (drifted since <date>)"
```

### Step 3 — apply the patch script

`scripts/patch-adminapi.py` in this repo applies **everything in steps 3 and 3b** to a copy and aborts if any expected line is not found exactly the expected number of times (the box copy has drifted, so this is the safety net):

```bash
cd ~/Developer/wist-admin
python3 scripts/patch-adminapi.py ~/Developer/Node/adminapi.js          # writes adminapi.js.patched
cp ~/Developer/Node/adminapi.js.patched /tmp/adminapi.check.js && node --check /tmp/adminapi.check.js
```

If it aborts, the box copy differs around the named edit; look at that spot and adjust the `EDITS` list. What the script does, for review:

In the box copy, after `app.use(cors(corsOptions))` and **before** the `bodyParser` lines, it adds:

```js
const authGuard = require("./authGuard")
app.use(authGuard({ service: "admin", protect: [/^\//] }))
```

`protect` entries are matched against the path as Express sees it (the reverse proxy strips `/admin`), and `authGuard.js:94-97` matches a string **exactly** or tests a RegExp. The admin service has no public routes, so one regex covering every path is correct; a string list would silently miss `/user/:id/threads`.

`WIST_AUTH_MODE` is read from the same `.env` as the sandbox service, so `adminapi` starts in **audit** mode automatically. Commit this change to `wist-team/Node` too.

### Step 3b — fix the stats SQL in the same upload

Three long-standing defects in `GET /users` (and one in `GET /stats`). Apply to the **box copy**; the line numbers below are from the repo copy and will be close but not exact.

**a. Day span excludes today.** Every `DATEDIFF(CURDATE(), MIN(st.syft_thread_timestamp))` in the `/users` query should be `(DATEDIFF(CURDATE(), MIN(st.syft_thread_timestamp)) + 1)`. There are seven occurrences: `days_since_first_message`, `days_missed`, `missed_days_percentage` (twice), `avg_messages_per_day`, `avg_syft_data_responses_per_day`, `total_messages_per_day`, plus the two weekday/weekend denominators which already add 1 inside `FLOOR(...)`. The admin app derives days missed and the missed percentage on the client from `first_activity`, so those two will agree either way; the per-day averages only come right with this change.

**b. Meals overcount symptom logs.** Symptom-only rows carry `"nutritionData": {}` and match `LIKE '%nutritionData%'`. In all three places (`/users` as `user_meal_count`, `/stats` as `total_meals`, `/meals`' WHERE clause) the condition becomes:

```sql
st.syft_thread_sender_type = 'syft-data' AND st.syft_thread_content LIKE '%nutritionData%'
  AND st.syft_thread_content NOT LIKE '%"nutritionData": {}%'
  AND st.syft_thread_content NOT LIKE '%"nutritionData":{}%'
```

Two `NOT LIKE`s because the JSON has been serialised with and without a space over the years. This was chosen over `JSON_EXTRACT`, which is correct but parses every row's content on a query that already scans the whole `syft_thread` table.

**c. Liked and disliked are swapped.** The user app stores thumbs-up as `syft_thread_rating = 1` and thumbs-down as `-1` (`screens/Chat/ChatMessage.js:2018-2021`). In `/users` and `/stats`:

```sql
-- was: rating = -1 → liked, rating = 1 → disliked
COUNT(CASE WHEN st.syft_thread_sender_type = 'syft-bot' AND st.syft_thread_rating = 1  THEN 1 END) AS liked_responses,
COUNT(CASE WHEN st.syft_thread_sender_type = 'syft-bot' AND st.syft_thread_rating = -1 THEN 1 END) AS disliked_responses,
```

The admin app does **not** swap these on the client, deliberately, so there is no double-swap once the server is right. Until then, read "Liked" as disliked in the app.

**d. Per-day averages should count user messages only.** `avg_messages_per_day`, `avg_weekday_logs` and `avg_weekend_logs` count every row (user, bot reply, meal card), so they run about three times the user's own rate. Restrict each numerator to `st.syft_thread_sender_type = 'user'`:

```sql
-- avg_messages_per_day: replace COUNT(st.syft_thread_id) with
COUNT(CASE WHEN st.syft_thread_sender_type = 'user' THEN 1 END)

-- weekday_logs / avg_weekday_logs numerator:
COUNT(CASE WHEN st.syft_thread_sender_type = 'user' AND DAYOFWEEK(st.syft_thread_timestamp) BETWEEN 2 AND 6 THEN 1 END)

-- weekend_logs / avg_weekend_logs numerator:
COUNT(CASE WHEN st.syft_thread_sender_type = 'user' AND DAYOFWEEK(st.syft_thread_timestamp) IN (1, 7) THEN 1 END)
```

The admin app already derives the daily figure on the client as `user_message_count / inclusive span` and labels it "Avg user msg per day". The weekday and weekend figures are labelled the same way but come straight from the server, so they read high until this lands. `total_messages_per_day` can stay as the all-rows figure; nothing displays it.

### Step 4 — upload with the atomic swap

Follow §3 of the auth handover exactly (upload as `adminapi.js.new`, `sha256sum`, back up outside the watched dir, `mv`). PM2 watch restarts `adminapi` on the rename. Then confirm:

```bash
su - ec2-user -c "grep 'guard loaded' /home/ec2-user/.pm2/logs/adminapi-out.log | tail -1"
# expect: [WIST_AUTH] guard loaded service=admin mode=audit keys=3 header=x-wist-proxy-key protect=[...]
```

`keys=3` (or however many are configured) matters: `keys=0` means `.env` is not being read and the guard is permanently permissive.

### Step 5 — enforce, after Release 1 adoption

Once everyone is on the new TestFlight build (and build 26 has expired, ~27 Sep 2026), check that the admin service's log shows `outcome:ok caller:admin-app` and no `no-key` entries for a few days, then set `WIST_AUTH_MODE=enforce` and restart **only** `adminapi`:

```bash
su - ec2-user -c "/home/ec2-user/.nvm/versions/node/v16.20.1/bin/pm2 restart adminapi"
```

Note `WIST_AUTH_MODE` is shared with `syftPromptDev`; if that service is not ready to enforce, give the guard a per-service mode first (a one-line change in `authGuard.js` to read `WIST_AUTH_MODE_ADMIN` with fallback).

## 2. Sensitivity exposures route for a given user (`wist-api`)

The app's food detail sheet calls `GET /me/sensitivity/{sourceCategory}/exposures` (Cognito-bound). The admin app needs the same payload for an arbitrary user, gated by the portal key like the existing `GET /users/{userId}/sensitivity`.

### `template.yaml`

Add next to `GetSensitivity` (around line 404):

```yaml
        GetSensitivityExposures:
          Type: Api
          Properties:
            Path: /users/{userId}/sensitivity/{sourceCategory}/exposures
            Method: get
            RestApiId: !Ref WistApiGateway
```

### `wist-aws-api/handlers/wist-sensitivity-engine/results.mjs`

In `buildHandler`, after the `authorise(event)` check and the `userId` guard (around line 496), add before the existing `if (method === 'GET' && !isDisposition)` line:

```js
      if (method === 'GET' && (event.resource || event.path || '').includes('/exposures')) {
        const sourceCategory = event.pathParameters?.sourceCategory;
        if (!sourceCategory) return response(400, { error: 'sourceCategory path parameter is required' });
        const exposures = await getExposures(String(userId), sourceCategory, now());
        return response(200, { userId: String(userId), sourceCategory, exposures });
      }
```

`getExposures` is already imported. Add a unit test alongside the existing results tests that calls the handler with `resource: '/users/{userId}/sensitivity/{sourceCategory}/exposures'` and a valid portal key, asserting a 200 and the payload shape.

### Deploy

```bash
cd ~/Developer/wist-api
sam build
sam deploy --config-env dev  --parameter-overrides "DeploymentId=$(date +%s)"
sam deploy --config-env prod --parameter-overrides "DeploymentId=$(date +%s)"
```

Both stacks are live (see the auth handover §5, step 2). `~/Developer/wist-api-checkin-link` is the same repo on another branch and needs the same change or it will revert on merge.
