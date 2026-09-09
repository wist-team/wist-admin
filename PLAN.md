# Wist Admin — rebuild plan

*Agreed 3 September 2026 after a decision-by-decision review of `REBUILD_HANDOVER.md`. This is the working plan; the handover is the background.*

## Why two releases

TestFlight build 26 stops launching around **27 September 2026**. Release 1 exists to get every team device onto a build that outlives that date and to make the app updatable over the air. Release 2 adds the per-user views and ships as an EAS Update unless the native fingerprint changes.

**Distribution changed on 9 Sep 2026 (decision 9):** Release 1 ships as an **ad hoc** build from the `preview` profile, installed from the EAS link on registered devices. It expires with the provisioning profile (12 months), not after 90 days. TestFlight is held in reserve.

## Decisions

| # | Decision |
|---|---|
| 1 | Two releases. Release 1 is a minimal port to reset the TestFlight clock; Release 2 adds the user views. |
| 2 | Auth: baked shared key named `admin-app:<key>` in the box's `WIST_API_KEYS`, sent as `x-wist-proxy-key` to **every** host the app calls, so later enforcement on any service needs no client change. |
| 3 | Expo SDK **57** (upgraded from 56 on 7 Sep 2026 after expo-doctor flagged SDK 56's Hermes memory regression), Jon's recovered `app.config.json` as the base. Bundle ID `site.syft.admin.v2` unchanged (App Store Connect record, testers and history hang off it). |
| 4 | React Navigation v7 (native stack), plain `StyleSheet`, TypeScript for new code. Vendored user-app files stay `.js`. No Expo Router. |
| 5 | Dropped: Scores (not wanted), Logs (calls a path-traversal endpoint, unused since June), Meals (crashes, low value), Stats (low value). Meals/Stats may return later. |
| 6 | Navigation is a native stack only: Users list → User detail. No tab bar until a second top-level section exists. Tabs are likely to return in Release 2 for monitoring / error logging. |
| 7 | User detail has a segmented control. Release 1 ships the **Raw** segment (raw `syft_thread` rows, sender type, parsed JSON, API version, S3 image, long-press delete). Raw is permanent; it is the debugging view. |
| 8 | `runtimeVersion: { policy: "fingerprint" }`. New update channel `production`. App version `1.1.0`, iOS build 27. The existing `master` branch (a stale SDK 52 bundle at runtime 1.0.0) is never published to again. |
| 9 | **Ad hoc is the primary distribution** (changed 9 Sep 2026). EAS profiles `development`, `preview`, `production`, `simulator`. `preview` (`distribution: internal`, iOS ad hoc + Android APK, channel `preview`) is what the team installs, from the EAS build link; devices are registered with `eas device:create` and added without a rebuild via `eas build:resign`. Ad hoc builds expire with the provisioning profile (12 months, renew ~March 2027), not after 90 days. `production` (TestFlight) stays configured and is used only if someone needs the app on a device that cannot be registered; no App Store submission is ever planned. |
| 10 | Chat, History, Insights (Nutrients) and Profile render from `GET https://api.syfthealth.app/wist_lambda/users/{idUser}/sync` — the exact payload the user's device receives, including its truncation windows (150 messages, 30 days of meals, 180 days of symptoms, 14 daily summaries). |
| 11 | Sensitivities renders from `GET {sensitivity gateway}/users/{idUser}/sensitivity` with `x-wist-portal-key`. The per-food exposures drill-down needs a new route `GET /users/{userId}/sensitivity/{sourceCategory}/exposures` added to `wist-api`; the food detail sheet is hidden until it responds. |
| 12 | User-app code is **vendored**: pure-logic files copied verbatim with a provenance manifest (source path + user-app commit hash) and a drift-check script. Heavy chrome (message renderer, chat meal card) is rebuilt as lean read-only components over the same data shapes. |
| 13 | User-view segments render in the user app's palette and fonts (AlbertSans, `#FCF5F1` background, `#F47676` coral) like a window onto the user's phone; the admin chrome stays dark. Segments are **fully read-only**. The only mutation in the app is delete, in Raw. |
| 14 | Production data only in every profile. Two keys as EAS environment variables with `sensitive` visibility: `EXPO_PUBLIC_WIST_ADMIN_KEY`, `EXPO_PUBLIC_WIST_PORTAL_KEY`. The app refuses to start with a clear message if either is missing. Local `.env` is gitignored. |
| 15 | Server work split: Claude prepares patched files, diffs and exact commands; Harry performs the box swap (PM2 watch mode, Webmin upload, atomic rename) and the SAM deploys. `adminapi.js` goes behind `authGuard` in **audit** mode first; **enforce** only after everyone is on Release 1 (build 26 dies ~27 Sep anyway). |
| 16 | Code lives in this repo at `wist-team/wist-admin` (private; created under `harry-neal-wist` and transferred into the org on 3 Sep 2026). `recovered/` stays committed; it is the only specification. The 2024 backup is not imported. |
| 17 | Verification: `jest-expo` on pure logic (client header attachment, typed responses against captured fixtures, vendored transforms); simulator against production compared with build 26 while it still launches; an ad hoc `preview` build on Harry's phone before every `production` build. |

## Sequence

### Release 1 — every team device on the ad hoc build before 27 September

1. **Credentials.** Run `eas credentials -p ios` (interactive) and confirm the distribution certificate, provisioning profile and App Store Connect API key exist in the `jonmhall` account. Confirm the Apple Developer membership renewal date. If either is missing, nothing else can ship.
2. **Scaffold.** SDK 56, TypeScript, React Navigation, three EAS profiles, fingerprint runtime, `production` and `preview` channels, EAS environment variables. First commit pushed to `wist-team/wist-admin`.
3. **HTTP client.** One module: base hosts, typed responses, key attachment on every request, startup check for missing keys. Generate the admin key (`openssl rand -hex 32`), hand over the `.env` line for the box.
4. **Users.** List (sortable as build 26) and User detail with the Raw segment and delete, ported from `backups/SyftAdmin/screens/users.js` and corrected against `recovered/build26/decompiled.js` (S3 image host, six sort buttons, nested nutrition table with assumptions).
5. **Preview (ad hoc) build.** Renew the expired ad hoc certificate/profile (needs Harry's Apple ID in a terminal), register the team's devices, build, install on Harry's iPad from the EAS link.
6. **Compare** against build 26 on the Mac, field by field.
7. **Roll out.** Register Aman's and Ollie's devices, `eas build:resign` if needed, send the install link. TestFlight submission only if a device cannot be registered.
8. **Server.** Pull the box copy of `adminapi.js` into git, mount `authGuard` protecting every route in audit mode, atomic swap. Enforce after Release 1 adoption.

### Release 2 — OTA update unless the fingerprint changes

9. **Tokens and fonts.** Extract the user app's inline hex literals into a tokens file; bundle AlbertSans.
10. **Vendor** the pure-logic files with the manifest and drift script: `utils/symptomDisplay.js`, `calculateTotalNutrition` from `components/HistoryItem.js`, `reactHooks/useNutrientsTrends.js`, `services/sensitivities.js` adapters and the food/category catalogue, `constants/*`, `components/Insights/SensitivityCard.js`, `CategoryCard.js`, `components/Styles.js`.
11. **`/sync` client** with types, plus the Chat, History (Nutrition + Symptoms), Insights (Nutrients) and Profile segments. Replicate the ghost-meal downgrade and the `symptomData` lift from `syft_thread_content`.
12. **Sensitivities** summary segment with the portal key. Exposures route added to `wist-api` and deployed to dev and prod; then the food detail sheet.
13. **Tabs**, if a monitoring / error-logging section is wanted.

## Status — 9 September 2026

Read this before touching anything. Sequence steps above are annotated here rather than rewritten.

### Done

- Steps 1–4, 6 and 8. Code is on `wist-team/wist-admin` `main`; `npm run typecheck` and `npm test` (25 tests) pass. On **SDK 57** since 7 Sep.
- Raw view is signed off by Harry (9 Sep): newest first, symptom cards via the vendored user-app helper, nutrition table with component subtotals and standalone items in the accent colour, JSON and delete behind long-press. Users list stats corrected on the client where possible (day span, user-only daily average).
- **Server (step 8) applied 7 Sep:** `adminapi.js` on the box mounts `authGuard` in audit mode (`keys=3`, admin key registered as `admin-app`) and carries the stats SQL fixes. Live file = `wist-team/Node` commit `800d0fe`; backup on the box `/home/ec2-user/adminapi.js.bak-20260907`. Users endpoint 3.8 s. `docs/server-changes.md` §2 (exposures route on `wist-api`) still to do.
- Admin key: local `.env`, EAS (`preview` + `production`, sensitive), and the box.
- **Build 28** (iOS, `production` profile, SDK 57) is on EAS, unsubmitted: `https://expo.dev/accounts/jonmhall/projects/SyftAdmin/builds/1b802748-2caa-49cb-9ebc-15b9e49ba2e1`. It predates the 9 Sep nutrition-table changes. Held in reserve for TestFlight only (decision 9); if ever submitted, cut a newer one first.
- Day-to-day loop is `npx expo start` in Expo Go (see README); EAS builds only for artefacts.

### Open — needs Harry

1. **Ad hoc build for the iPad** (sequence step 5). In a real terminal: `cd ~/Developer/wist-admin && eas build --profile preview --platform ios`. Sign in with the Syft Health Ltd Apple ID when asked; reuse the existing distribution certificate if offered; include the iPad (UDID ending `52001E`) in the new profile. Install from the EAS build page link in Safari on the iPad. If the install says the device is not provisioned, register it with `eas device:create` and rebuild.
2. **Roll out** (step 7): register Aman's and Ollie's phones, `eas build:resign` the preview build to include them, send the link. Everyone must be installed before build 26 dies ~27 Sep.
3. **Enforce the guard** (`docs/server-changes.md` §1 step 5) once nobody is left on build 26.
4. **Portal key** for Release 2's Sensitivities view: locate in the team password manager or rotate by redeploying `wist-api` and `clinic-portal-api` with a new `PortalApiKey` / `WistPortalKey`, then add as `EXPO_PUBLIC_WIST_PORTAL_KEY` on EAS (`preview` and `production`).
5. **Exposures route** on `wist-api` (`docs/server-changes.md` §2), any time before the Sensitivities drill-down.
6. **Calendar:** renew the ad hoc provisioning profile ~March 2027, a month before it lapses; the App Store certificate lapses 15 Apr 2027.

### Gotchas learned (do not rediscover these)

- **Day-to-day testing is Expo Go, not EAS builds.** `npx expo start` + `i` runs the app from Metro in Expo Go. No custom native modules yet, so this covers everything; EAS builds are for artefacts only. If the simulator stops picking up edits after the Mac sleeps, Cmd+R in the simulator or `xcrun simctl openurl booted exp://localhost:8081` re-establishes the Metro connection.
- **Local Xcode is too old.** SDK 57 requires Xcode ≥ 26.4; this Mac has 26.0.1, so `npx expo run:ios` fails with Swift errors inside `expo-modules-jsi`. Not needed while Expo Go suffices. A stale `ios/` folder from that attempt exists locally; it is gitignored and easignored.
- **SDK upgrade:** `npx expo install expo@^57 --fix` failed on a peer conflict until `jest-expo` was bumped to the matching line by hand first.
- **First `expo start` may fail with `ENOENT` renaming `~/.expo/codesigning/<projectId>/…json`.** Metro stays up but never bundles and Expo Go sits on the splash. Kill and restart; it works the second time.
- **`.easignore` replaces `.gitignore` entirely.** The first version omitted `ios/` and `node_modules/`, uploading 394 MB and a Hermes compiler path from Harry's Mac, which failed the EAS build. The current `.easignore` is correct; keep it in sync with `.gitignore`.
- **`eas build:view --json` can emit control characters** in error messages; parse with `json.loads(..., strict=False)`.
- **EAS Xcode logs download brotli-encoded**; `curl --compressed` does not decode `br` on this machine, use `brotli -d`.
- **The admin users endpoint returns the 100 most recently active users** (an inner join in the box copy of `adminapi.js`, now in git). Decimal columns arrive as strings; build 26 sorted them lexicographically, this port sorts numerically.
- **Never use `NOT LIKE` on `syft_thread_content` in the aggregate queries.** Proving absence scans every row's whole JSON: 27 s versus 1.3 s for a positive `LIKE`. The first upload on 7 Sep shipped one and tripled the app's first-screen load; the second upload fixed it. Time the endpoints after every server change.
- **`platform_color` in the handover is React Native internals**, not an API field. Ignore it.
- **`syft-data.message` is an object** (the echoed user message), not text. The meal is in `nutritionDataNested` (fallback `nutritionData`), with per-ingredient `assumptions` strings. Symptom logs have `nutritionData: {}` and a `symptomData.symptoms` object.
- **A React Native `ScrollView` defaults to `flexGrow: 1`.** A horizontal scroller in a column layout must set `flexGrow: 0` or it takes half the screen.
- **The classifier that gates shell commands in auto mode can go down**; file edits still work, so prepare files and hand the commands to Harry.

## Reference facts

- EAS: logged in as `harryn`, Admin on the `jonmhall` account. Project `346028dc-64f8-4f99-8c45-8b64faf30466`.
- Apple: build 26 is signed by team `KDA4G895QS` (Syft Health Ltd, provider 127635333), not Jon's personal team `4N2ZXVJDVE`. Verified 3 Sep 2026 via `eas credentials`: App Store distribution certificate and profile valid to **15 Apr 2027**; an App Store Connect API key is stored; the **ad hoc certificate and profile expired 14 Apr 2026** and must be regenerated (needs an Apple ID with Admin on the team) before the `preview` profile can build. Harry has an Apple ID on the team.
- The admin key is on EAS (`EXPO_PUBLIC_WIST_ADMIN_KEY`, preview + production, sensitive). The portal key is not yet located: it is a NoEcho CloudFormation parameter on `wist-api` and `clinic-portal-api` with no copy in `samconfig.toml`.
- Build 26 was built from git commit `a2f0cd9a` ("Upgrade Expo SDK 55 -> 56", Claude-co-authored). Jon's machine has the source and the Claude sessions.
- User app (`~/Developer/wist`): SDK 54, React Navigation v7, plain StyleSheet, Cognito via Amplify, SQLite as the on-device source of truth fed by `/sync`.
- `/sync` server implementation: `~/Developer/Node/wistLambda.js:812`. Message shaping at `:487-616`.
- Sensitivity handler: `~/Developer/wist-api/wist-aws-api/handlers/wist-sensitivity-engine/results.mjs`. Routes in `~/Developer/wist-api/template.yaml:404-433`.
- Auth guard and box procedures: `~/Developer/Node/API_AUTH_HANDOVER.md`.
