# Wist Admin — rebuild plan

*Agreed 3 September 2026 after a decision-by-decision review of `REBUILD_HANDOVER.md`. This is the working plan; the handover is the background.*

## Why two releases

TestFlight build 26 stops launching around **27 September 2026**. Release 1 exists to reset that clock and to make the app updatable over the air. Release 2 adds the per-user views and ships as an EAS Update unless the native fingerprint changes.

## Decisions

| # | Decision |
|---|---|
| 1 | Two releases. Release 1 is a minimal port to reset the TestFlight clock; Release 2 adds the user views. |
| 2 | Auth: baked shared key named `admin-app:<key>` in the box's `WIST_API_KEYS`, sent as `x-wist-proxy-key` to **every** host the app calls, so later enforcement on any service needs no client change. |
| 3 | Expo SDK 56, Jon's recovered `app.config.json` as the base. Bundle ID `site.syft.admin.v2` unchanged (App Store Connect record, testers and history hang off it). |
| 4 | React Navigation v7 (native stack), plain `StyleSheet`, TypeScript for new code. Vendored user-app files stay `.js`. No Expo Router. |
| 5 | Dropped: Scores (not wanted), Logs (calls a path-traversal endpoint, unused since June), Meals (crashes, low value), Stats (low value). Meals/Stats may return later. |
| 6 | Navigation is a native stack only: Users list → User detail. No tab bar until a second top-level section exists. Tabs are likely to return in Release 2 for monitoring / error logging. |
| 7 | User detail has a segmented control. Release 1 ships the **Raw** segment (raw `syft_thread` rows, sender type, parsed JSON, API version, S3 image, long-press delete). Raw is permanent; it is the debugging view. |
| 8 | `runtimeVersion: { policy: "fingerprint" }`. New update channel `production`. App version `1.1.0`, iOS build 27. The existing `master` branch (a stale SDK 52 bundle at runtime 1.0.0) is never published to again. |
| 9 | EAS profiles `development`, `preview`, `production`. `preview` is `distribution: internal` (iOS ad hoc + Android APK) with its own channel; `production` is iOS only, submitted to TestFlight. Ad hoc iOS builds expire with the provisioning profile (12 months), not after 90 days. |
| 10 | Chat, History, Insights (Nutrients) and Profile render from `GET https://api.syfthealth.app/wist_lambda/users/{idUser}/sync` — the exact payload the user's device receives, including its truncation windows (150 messages, 30 days of meals, 180 days of symptoms, 14 daily summaries). |
| 11 | Sensitivities renders from `GET {sensitivity gateway}/users/{idUser}/sensitivity` with `x-wist-portal-key`. The per-food exposures drill-down needs a new route `GET /users/{userId}/sensitivity/{sourceCategory}/exposures` added to `wist-api`; the food detail sheet is hidden until it responds. |
| 12 | User-app code is **vendored**: pure-logic files copied verbatim with a provenance manifest (source path + user-app commit hash) and a drift-check script. Heavy chrome (message renderer, chat meal card) is rebuilt as lean read-only components over the same data shapes. |
| 13 | User-view segments render in the user app's palette and fonts (AlbertSans, `#FCF5F1` background, `#F47676` coral) like a window onto the user's phone; the admin chrome stays dark. Segments are **fully read-only**. The only mutation in the app is delete, in Raw. |
| 14 | Production data only in every profile. Two keys as EAS environment variables with `sensitive` visibility: `EXPO_PUBLIC_WIST_ADMIN_KEY`, `EXPO_PUBLIC_WIST_PORTAL_KEY`. The app refuses to start with a clear message if either is missing. Local `.env` is gitignored. |
| 15 | Server work split: Claude prepares patched files, diffs and exact commands; Harry performs the box swap (PM2 watch mode, Webmin upload, atomic rename) and the SAM deploys. `adminapi.js` goes behind `authGuard` in **audit** mode first; **enforce** only after everyone is on Release 1 (build 26 dies ~27 Sep anyway). |
| 16 | Code lives in this repo, pushed to `wist-team/wist-admin` (private) from the first scaffold commit. `recovered/` stays committed; it is the only specification. The 2024 backup is not imported. |
| 17 | Verification: `jest-expo` on pure logic (client header attachment, typed responses against captured fixtures, vendored transforms); simulator against production compared with build 26 while it still launches; an ad hoc `preview` build on Harry's phone before every `production` build. |

## Sequence

### Release 1 — submit to TestFlight by 20 September

1. **Credentials.** Run `eas credentials -p ios` (interactive) and confirm the distribution certificate, provisioning profile and App Store Connect API key exist in the `jonmhall` account. Confirm the Apple Developer membership renewal date. If either is missing, nothing else can ship.
2. **Scaffold.** SDK 56, TypeScript, React Navigation, three EAS profiles, fingerprint runtime, `production` and `preview` channels, EAS environment variables. First commit pushed to `wist-team/wist-admin`.
3. **HTTP client.** One module: base hosts, typed responses, key attachment on every request, startup check for missing keys. Generate the admin key (`openssl rand -hex 32`), hand over the `.env` line for the box.
4. **Users.** List (sortable as build 26) and User detail with the Raw segment and delete, ported from `backups/SyftAdmin/screens/users.js` and corrected against `recovered/build26/decompiled.js` (S3 image host, `platform_color`, `sender_type`).
5. **Preview build** on Harry's phone (and an Android APK) in week one. This is the first real test of signing and EAS variables.
6. **Compare** against build 26 on the Mac, field by field.
7. **Production build**, submit to TestFlight.
8. **Server.** Pull the box copy of `adminapi.js` into git, mount `authGuard` protecting every route in audit mode, atomic swap. Enforce after Release 1 adoption.

### Release 2 — OTA update unless the fingerprint changes

9. **Tokens and fonts.** Extract the user app's inline hex literals into a tokens file; bundle AlbertSans.
10. **Vendor** the pure-logic files with the manifest and drift script: `utils/symptomDisplay.js`, `calculateTotalNutrition` from `components/HistoryItem.js`, `reactHooks/useNutrientsTrends.js`, `services/sensitivities.js` adapters and the food/category catalogue, `constants/*`, `components/Insights/SensitivityCard.js`, `CategoryCard.js`, `components/Styles.js`.
11. **`/sync` client** with types, plus the Chat, History (Nutrition + Symptoms), Insights (Nutrients) and Profile segments. Replicate the ghost-meal downgrade and the `symptomData` lift from `syft_thread_content`.
12. **Sensitivities** summary segment with the portal key. Exposures route added to `wist-api` and deployed to dev and prod; then the food detail sheet.
13. **Tabs**, if a monitoring / error-logging section is wanted.

## Reference facts

- EAS: logged in as `harryn`, Admin on the `jonmhall` account. Project `346028dc-64f8-4f99-8c45-8b64faf30466`.
- Apple: build 26 is signed by team `KDA4G895QS` (Syft Health Ltd, provider 127635333), not Jon's personal team `4N2ZXVJDVE`. Verified 3 Sep 2026 via `eas credentials`: App Store distribution certificate and profile valid to **15 Apr 2027**; an App Store Connect API key is stored; the **ad hoc certificate and profile expired 14 Apr 2026** and must be regenerated (needs an Apple ID with Admin on the team) before the `preview` profile can build. Harry has an Apple ID on the team.
- The admin key is on EAS (`EXPO_PUBLIC_WIST_ADMIN_KEY`, preview + production, sensitive). The portal key is not yet located: it is a NoEcho CloudFormation parameter on `wist-api` and `clinic-portal-api` with no copy in `samconfig.toml`.
- Build 26 was built from git commit `a2f0cd9a` ("Upgrade Expo SDK 55 -> 56", Claude-co-authored). Jon's machine has the source and the Claude sessions.
- User app (`~/Developer/wist`): SDK 54, React Navigation v7, plain StyleSheet, Cognito via Amplify, SQLite as the on-device source of truth fed by `/sync`.
- `/sync` server implementation: `~/Developer/Node/wistLambda.js:812`. Message shaping at `:487-616`.
- Sensitivity handler: `~/Developer/wist-api/wist-aws-api/handlers/wist-sensitivity-engine/results.mjs`. Routes in `~/Developer/wist-api/template.yaml:404-433`.
- Auth guard and box procedures: `~/Developer/Node/API_AUTH_HANDOVER.md`.
