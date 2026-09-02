# Wist Admin — rebuild handover

*Written 2 September 2026. How to reconstruct the admin app, what we recovered, and the deadline.*

---

## 1. Situation

Jon Hall wrote and owned the Wist/Syft admin app. It was never on GitHub — the only repository we have is a local backup with **a single commit from 25 November 2023** and no remote configured. The working tree in that backup was last touched **3 July 2024**.

The app that is actually in TestFlight is **build 26, compiled 29 June 2026** — roughly two years of undocumented work beyond the backup.

There is no source for it. This document covers what we recovered instead, and how to rebuild from that.

### The deadline

TestFlight builds expire **90 days after upload**. Build 26 went up around 29 June 2026, so **the admin app stops launching around 27 September 2026.**

**EAS Update cannot extend this.** Per Expo's docs, an update delivers JS/TS only, to devices that already have a compatible native build; it never touches the native binary, and the 90-day clock is a property of the uploaded binary. Publishing updates does not move it.

Resetting the clock requires submitting a **new build**, which needs three things simultaneously:

1. A working source tree (this document's job)
2. Jon's Apple Developer membership still active
3. Signing credentials — distribution certificate, provisioning profile, App Store Connect API key

Item 3 is likely already available: Harry has access to the Expo account (`expo.dev/accounts/jonmhall/projects/SyftAdmin`), and EAS typically stores exactly those credentials. **Run `eas credentials` and confirm this before it becomes urgent** — it determines whether a rebuild can actually ship.

---

## 2. The two app records

There are two distinct App Store Connect apps, which is why "version 15" was never findable in TestFlight:

| | build 22 | build 26 |
|---|---|---|
| Bundle ID | `site.syft.admin` | `site.syft.admin.v2` |
| TestFlight name | "Syft Admin" | **"Wist Admin"** |
| Seller | Jon Hall | **Syft Health Ltd** |
| Version (build) | 1.0.0 (22) | 1.0.0 (26) |
| Compiled | 14 Sep 2025 | **29 Jun 2026** |
| Xcode | 16.2 | 26.4 |
| EAS project | `346028dc-64f8-4f99-8c45-8b64faf30466` | same |

Build 26 is a new bundle ID under an organisation seller, built from an evolved copy of the same Expo project. The 2024 backup carries `buildNumber: 15` on the *old* bundle ID — a different app record entirely, whose builds expired long ago.

The two builds' logic is nearly identical: only two new API field names between them (`platform_color`, `sender_type`). Everything else in the diff is the Expo SDK upgrade. **Build 22 is a usable cross-reference if anything in build 26 is unclear.**

---

## 3. What was recovered, and where it is

Everything below came from the app installed on Harry's Mac (`/Applications/SyftAdmin 2.app`). React Native's `main.jsbundle` is an unencrypted *resource* — FairPlay only encrypts the Mach-O executable — so it reads in plaintext with no decryption step.

```
recovered/
  build26/
    main.jsbundle      2.4M   Hermes bytecode v98, the shipped app
    decompiled.js       13M   full decompilation, original function names preserved
    strings.txt        374K   complete string table, one entry per line
    app.config.json    968B   Jon's exact Expo config for build 26
  build22/
    main.jsbundle      2.4M   Hermes bytecode v96
    decompiled.js       11M
    strings.txt        342K
  tools/
    hbc.py, hbc2.py           Hermes bytecode parsers (see §7)
```

> These are the only copies. They were produced in a temporary directory and copied here deliberately. **Do not delete `recovered/`** — regenerating it requires the app still being installed, and it will stop launching on ~27 September.

### `app.config.json` — the biggest single win

Jon's actual Expo config for build 26, lifted from `EXConstants.bundle/app.config`:

```json
{
  "name": "SyftAdmin", "slug": "SyftAdmin", "version": "1.0.0", "owner": "jonmhall",
  "sdkVersion": "56.0.0",
  "userInterfaceStyle": "dark",
  "runtimeVersion": { "policy": "appVersion" },
  "updates": { "url": "https://u.expo.dev/346028dc-64f8-4f99-8c45-8b64faf30466" },
  "ios": {
    "supportsTablet": true, "buildNumber": "26",
    "bundleIdentifier": "site.syft.admin.v2",
    "infoPlist": { "NSUserActivityTypes": ["INSendMessageIntent"],
                   "ITSAppUsesNonExemptEncryption": false }
  },
  "android": { "package": "site.syft.admin",
               "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png",
                                 "backgroundColor": "#282728" } },
  "plugins": ["expo-font", "expo-asset",
              ["expo-splash-screen", { "image": "./assets/splash.png",
                                       "resizeMode": "contain",
                                       "backgroundColor": "#282728" }],
              "expo-status-bar"]
}
```

**Target Expo SDK 56**, not the SDK 49 in the 2024 backup. Note there is **no `channel`** and no `EXUpdatesRequestHeaders` in the shipped binary — see §6.

### The 2024 backup

`/Users/harryneal/Documents/Syft/backups/SyftAdmin` — real source, Expo SDK 49, four of the six screens present. Stale, but it is Jon's own code in his own style, and the best structural template available.

Also there: `dist/bundles/ios-*.map`, a source map with `sourcesContent` for 707 files. It reveals his working directory —
`/Users/jonhall/Documents/Client Files/Shift/UserApp/Build/SyftAdmin` — worth knowing if his devices are ever recoverable.

---

## 4. What the app does

Five-tab bottom navigator. The 2024 backup has four; **`Scores` is new**.

| Tab | Icon | Components |
|---|---|---|
| Users | Feather `users` | `UsersScreen`, `UserDetailsModal` |
| Meals | MaterialCommunityIcons `food-outline` | `MealsScreen`, `MealsModal`, `NutritionDataTable` |
| Stats | Ionicons `stats-chart` | `StatsScreen` |
| Logs | AntDesign `filetext1` | `LogsScreen` |
| **Scores** | **AntDesign `trophy`** | **`ScoreScreen`** |

Recovered helper functions, by their original names: `fetchLeaderBoard`, `fetchUserThreads`, `fetchLogs`, `fetchLogFiles`, `fetchData`, `deleteMessage`, `getImageSource`, `handleUserClick`, `formatDate`, `MessageDisplay`, `ImageViewer`.

Component definitions in `build26/decompiled.js` (line numbers approximate; the file is ordered by function index, so library code is interleaved):

```
244180  App                 294489  TabsScreen*        303085  UserDetailsModal
304286  UsersScreen         338035  NutritionDataTable 338919  MealsModal
339419  MealsScreen         339908  StatsScreen        340778  LogsScreen
342578  ScoreScreen
```

*`TabsScreen` is react-native-screens, not Jon's.*

Jon's own code is roughly **7,000 lines of decompiled pseudo-JS**, which is on the order of **2,500–3,500 lines of original JS** across six modules. That is the size of the rebuild.

### API contract

```
GET    /admin/users
GET    /admin/user/{id}/threads
GET    /admin/meals
GET    /admin/stats
GET    /admin/leaderboard              ← new since the 2024 backup
GET    /sandbox/log-files
GET    /sandbox/logs?fileName=&length=
GET    /v1/messages/{thread_id}
DELETE /v1/messages/{id}               ← new since the 2024 backup
```

Base host `https://api.syfthealth.app`. Images moved from `images.syfthealth.app/userimages/` (2024) to **`wist-meal-images.s3.eu-west-1.amazonaws.com/`**.

Response fields, recovered from the string table:

`syft_thread_{id,content,sender_type,timestamp}`, `total_users`, `active_users`, `daily/weekly/monthly_active_users`, `total_meals`, `total_messages`, `user_meal_count`, `user_message_count`, `liked_responses`, `disliked_responses` (+ `total_` variants), `most_recent_activity`

New since the 2024 backup: `avg_messages_per_day`, `avg_syft_data_responses_per_day`, `avg_weekday_logs`, `avg_weekend_logs`, `days_active`, `days_missed`, `days_since_first_message`, `missed_days_percentage`, `total_time_spent`

UI labels recovered verbatim: `Daily Scores:`, `Weekly Score: `, `Daily Avg`, `Avg logs per day:`, `Avg msg per day: `, `Avg weekday: `, `Avg weekend: `, `Days active: `, `Days missed: `, `Total/Daily/Weekly/Monthly Active Users: `, `User ID: `, `User Sub: `, `UserData Records: `, `Syft Breakdown:`, `Assumptions:`, `Delete Message`, `TestFlight user`.

### The delta versus the 2024 backup

Four screens carry over structurally. What's new:

1. **`ScoreScreen`** — leaderboard, `/admin/leaderboard`. State: `leaderboardData`, `dailyScores`, `dailyScoreItem`, `dailyScoresContainer`, `dailyScoresTitle`, `weeklyScore`, plus an "Assumptions" block (`allAssumptions`, `assumptionsHeading`, `assumptionText`)
2. **Message deletion** — `deleteMessage`, `DELETE /v1/messages/{id}`, logs `Deleting message with ID:` / `Message deleted successfully:`
3. **Image host change** — S3 bucket instead of `images.syfthealth.app`
4. **Nine new stats fields** (above)
5. **Expo SDK 49 → 56**

---

## 5. Suggested rebuild approach

The decompiled output is register-level pseudo-JS — faithful, but **not compilable**. Treat it as a specification, not a source to patch.

1. **Scaffold** a fresh Expo SDK 56 project using `recovered/build26/app.config.json` verbatim. Keep `bundleIdentifier: site.syft.admin.v2` — the App Store Connect record, testers and TestFlight history all hang off it, and it cannot be recreated once consumed.
2. **Port the four existing screens** from the 2024 backup (`screens/users.js`, `meals.js`, `stats.js`, `logs.js`, `components/NutritionDataTable.js`, `App.js`), then bring them forward using the decompilation to catch the two years of drift.
3. **Write `screens/score.js` from scratch** against `decompiled.js` around line 342578. This is the only screen with no starting point.
4. **Add the `Scores` tab** to `App.js` (AntDesign `trophy`) and the `deleteMessage` flow.
5. **Verify against the live API** — every endpoint in §4 is currently reachable, which makes field-by-field checking straightforward.

Reading the decompilation: search for a string literal to find the code that uses it. Endpoints are the easiest anchors — `grep -n 'api.syfthealth.app' recovered/build26/decompiled.js`. Original function names survive as `// Original name: X` comments.

**Cross-check against the API's own source.** `~/Developer/Node/adminapi.js` implements `/admin/*` and shows exactly what each endpoint returns — often faster than reading decompiled output.

---

## 6. Constraints to know before planning

**Build 26 has no update channel.** Its `Expo.plist` contains `EXUpdatesURL` and `EXUpdatesRuntimeVersion: 1.0.0` but **no `EXUpdatesRequestHeaders`**, meaning no `expo-channel-name` is baked in. Without a channel header `u.expo.dev` has no branch to resolve, so an OTA update most likely cannot reach the installed build. Verify on the EAS dashboard before relying on it. Practical consequence: **the shipped admin app probably cannot be changed at all** without a new native build — including to add an API key, which matters for the `/admin/*` authentication work (see `~/Developer/Node/API_AUTH_HANDOVER.md`).

**EAS holds no source.** `eas build` uploads from your local project; there is no downloadable project archive. What EAS *can* give you is build metadata — `eas build:view <id> --json` includes `gitCommitHash`. If a commit hash is recorded it proves Jon built from a git repo and identifies the exact commit, which is worth knowing if his devices are ever recovered. The build 26 artefact itself was cleaned up on 29 July 2026, but that no longer matters — we have the bundle.

**The API is currently unauthenticated.** Every endpoint in §4 is open to the internet with no credentials. That is being fixed separately; see `~/Developer/Node/API_AUTH_HANDOVER.md`. The rebuild should assume `/admin/*` **will** require a credential, and should be built to send one from the start rather than retrofitting.

**`adminapi.js` on the server has drifted from git** (box 22.07 KiB vs repo 17.28 KiB). If you need the exact current behaviour of `/admin/*`, download the box copy rather than trusting the repo.

---

## 7. Reproducing the decompilation

Should you need to redo this — a different build, or verification.

The bundle is **Hermes bytecode, not JavaScript**. Two things bite:

**`strings` produces garbage.** Hermes packs its string table into one buffer with no separators, so `strings` merges adjacent entries into nonsense like `/admin/leaderboardDatabBarAllowFontScaling…`. You must parse the string table properly — `tools/hbc2.py` does this, locating the table by structural validity rather than trusting the header offsets.

**Bytecode v98 changed the header layout.** `SmallFuncHeader` is **12 bytes**, not the 16 documented for earlier versions. Assuming 16 puts every section offset wrong. `hbc2.py` derives the size rather than assuming it:

```
funcHeaderBytes = (stringTableOffset - 128 - stringKindCount*4 - identifierCount*4) / functionCount
```

Verified: v98 → 12 bytes, v96 and v94 → 16.

**Full decompilation** uses [`hermes-dec`](https://github.com/P1sec/hermes-dec), which supports bytecode v51–v99 and handled both v96 and v98 here:

```bash
python3 -m venv .venv && ./.venv/bin/pip install hermes-dec
./.venv/bin/python .venv/lib/python3.11/site-packages/hermes_dec/decompilation/hbc_decompiler.py \
    recovered/build26/main.jsbundle out.js
```

Function *names* are stripped in release builds, but `hermes-dec` recovers them from Hermes' own name-inference strings (`?anon_0_fetchLeaderBoard` and similar) and emits them as `// Original name:` comments. That is what makes the output readable.

---

## 8. Immediate actions

| Priority | Action |
|---|---|
| 1 | **`eas credentials`** — confirm the iOS distribution certificate and App Store Connect API key are in Jon's Expo account. This determines whether a rebuild can ship at all, and everything else is wasted effort if it can't. |
| 2 | Confirm the Apple Developer membership renewal date and that it is paid. |
| 3 | Scaffold the SDK 56 project and port the four existing screens. |
| 4 | Write `ScoreScreen` from the decompilation. |
| 5 | Build and submit to TestFlight **before ~20 September** to leave margin on the 27th. |

If the deadline is missed, the admin app goes dark until the Apple account situation is resolved. The endpoints keep working, so a stopgap web page against the same API is a viable fallback — and, being off TestFlight entirely, is not subject to any of this.

---

*Related: `~/Developer/Node/API_AUTH_HANDOVER.md` (API authentication) and `~/Documents/Syft/jon-hall-asset-transfer-report.md` (the wider asset and account transfer position).*
