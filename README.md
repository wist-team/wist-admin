# Wist Admin

Internal iOS/Android app for looking at Wist users and their data. Rebuilt in September 2026 from a decompiled TestFlight bundle; see `REBUILD_HANDOVER.md` for the history and `PLAN.md` for the agreed plan and decisions.

## Run locally

```bash
cp .env.example .env      # fill in the two keys from the team password manager
npm install
npx expo start            # then press i — installs the matching Expo Go on the simulator, reloads on every save
```

Release 1 has no custom native code, so **Expo Go is the day-to-day loop**: no EAS build, no Xcode. Two cases need more:

- **Native dependencies added** (Release 2 may pull in gesture-handler, reanimated, bottom-sheet): build a dev client once with `eas build --profile development --platform ios` (add `"ios": {"simulator": true}` to that profile for the simulator), then `npx expo start --dev-client`. Rebuild only when native deps change again.
- **Testing the real release artifact**: `eas build --profile simulator --platform ios`, then `xcrun simctl install booted <WistAdmin.app>`. Use sparingly; each one is an EAS build.

`npx expo run:ios` (local native build) needs Xcode ≥ 26.4 for SDK 57.

If Metro logs `ENOENT ... .expo/codesigning/<projectId>/...json` on the first start, stop it and run it again; the cache directory races on first creation.

Checks: `npm run typecheck`, `npm test`.

## Build and ship

Profiles are in `eas.json`. Keys come from EAS environment variables (`sensitive` visibility) on the `preview` and `production` environments, never from git.

```bash
eas build --profile preview --platform all      # ad hoc iOS + Android APK, installs from the EAS link
eas build --profile production --platform ios   # TestFlight
eas submit --profile production --platform ios
eas update --channel production --environment production --message "..."   # JS-only changes
```

The runtime version is a native fingerprint: an OTA update is only ever served to a binary with an identical native layout. If `eas update` reports no matching builds, the change needs a new build.

## Layout

```
app.config.ts          Expo config (Jon's build 26 config, annotated where changed)
src/config/env.ts      the two baked keys, and the startup check
src/api/               HTTP client (attaches the admin key to every host), typed endpoints
src/lib/               pure helpers with tests: sorting, content parsing, formatting
src/screens/           Users list → User detail (segmented; Release 1 has Raw only)
src/components/        Raw threads view, segmented control
recovered/             decompiled build 22/26 bundles — the only specification. Do not delete.
```
