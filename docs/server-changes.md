# Server changes for the admin app

Two server-side changes fall out of `PLAN.md`. Neither blocks Release 1: the guard ignores unknown headers, so the app can send its key before anything checks it. Both are performed by Harry (box access, SAM deploys); this file is the prepared work.

## 1. Admin API behind `authGuard` (box: `adminapi.js`)

Background and box procedures: `~/Developer/Node/API_AUTH_HANDOVER.md` §2–§3. The box copy of `adminapi.js` has drifted from git (22.07 KiB vs 17.28 KiB), so **download the box copy and patch that**, never the repo copy.

### Step 1 — register the key (no restart needed yet)

The admin app's key is in the local `.env` of this repo and already on EAS (`EXPO_PUBLIC_WIST_ADMIN_KEY`, environments `preview` and `production`, visibility sensitive). Append it to `WIST_API_KEYS` in `/home/ec2-user/syft_api/.env`, comma-separated, named `admin-app`:

```
WIST_API_KEYS=lambda-dev:<k1>,lambda-prod:<k2>,admin-app:<admin key>
```

Store the key in the team password manager under "Wist Admin app key".

### Step 2 — pull the box copy into git

```bash
# on your Mac
scp ec2-user@108.129.8.46:/home/ec2-user/syft_api/adminapi.js ~/Developer/Node/adminapi.js
cd ~/Developer/Node && git diff --stat && git commit -am "adminapi.js: import box copy (drifted since <date>)"
```

### Step 3 — mount the guard

In the box copy, after `app.use(cors(corsOptions))` and **before** the `bodyParser` lines, add:

```js
const authGuard = require("./authGuard")
app.use(authGuard({ service: "admin", protect: [/^\//] }))
```

`protect` entries are matched against the path as Express sees it (the reverse proxy strips `/admin`), and `authGuard.js:94-97` matches a string **exactly** or tests a RegExp. The admin service has no public routes, so one regex covering every path is correct; a string list would silently miss `/user/:id/threads`.

`WIST_AUTH_MODE` is read from the same `.env` as the sandbox service, so `adminapi` starts in **audit** mode automatically. Commit this change to `wist-team/Node` too.

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
