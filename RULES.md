# Project Rules and Guards

Authoritative, repeatable rules to prevent regressions in dev and CI. Keep this file up to date as we learn.

## Environment and startup
- Use `.env.local` for local development configuration. Required keys:
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - Optional monitoring: `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`
  - Ads toggle: `EXPO_PUBLIC_ENABLE_ADS=1|0`
  - Header debug tools: `EXPO_PUBLIC_DEBUG_TOOLS=0|1`
- Start Metro before opening the Dev Client. Prefer:
  - `npm run start` (or `start:clear`), then `npm run open:android`, or
  - `npm run dev:android` (spawns server then opens client).
- Ensure ADB reverse is set for ports 8081 (Metro) and 8083 (Dev server): `adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8083 tcp:8083`.

## Supabase auth
- Additional Redirect URLs in Supabase MUST include: `exp+exp-final://auth-callback`.
- Always pass `emailRedirectTo = Linking.createURL('/auth-callback')` with `signInWithOtp` so magic links return to the app.
- Email templates must include the 6‑digit token: `{{ .Token }}`.
- Route after login via the gate: `profiles-gate` calls `routeAfterLogin()` to select dashboard by role (user_metadata.role or profiles.role) and optional `preschool_id`.
- Persist sessions with `expo-secure-store`. After adding new native modules, rebuild the dev client.

## Monitoring
- Sentry and PostHog are opt‑in via env keys. Do not hardcode keys.
- Use `EXPO_PUBLIC_DEBUG_TOOLS=1` only in dev to expose test buttons that send telemetry events.

## UI/UX guards
- Every form MUST use the keyboard‑aware wrapper `KeyboardScreen` to avoid hidden inputs on focus.
- Dev headers are themed dark for consistency; production headers can be hidden or customized.

## Ads (development only)
- Use `react-native-google-mobile-ads` with Google TEST IDs in dev. We must not ship test IDs in production.
- Android Manifest MUST define: `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-3940256099942544~3347511713" tools:replace="android:value"/>` to avoid manifest merge conflicts.
- Only render ads when `EXPO_PUBLIC_ENABLE_ADS=1`. Default should be safe in dev.

## Package/version hygiene
- Never pin to non‑existent package versions. Before adding a library, check the registry:
  - `npm view <package> version` or `npm view <package> versions --json`
- `expo-ads-admob` is deprecated for current SDKs — use `react-native-google-mobile-ads` instead.
- If install errors occur, prefer a clean install: remove `node_modules` and `package-lock.json`, run `npm cache verify`, then `npm install --legacy-peer-deps`.

## Android build guards
- If you see manifest merge failures for Google Mobile Ads APPLICATION_ID, add `tools:replace="android:value"` to the `<meta-data>` entry and include the `xmlns:tools` namespace on the `<manifest>` tag.
- After adding any new native modules (SecureStore, Sentry, PostHog, Google Mobile Ads), run `npx expo run:android` to rebuild the dev client.

## Known device/system log noise
- System logs like `E/UxUtility: notifyAppState error = NULL` and `E/libPowerHal: ...` are device/SoC power subsystem messages and not app failures. Ignore unless accompanied by app stack traces.
- `DevLauncherErrorActivity` indicates the app couldn’t reach Metro. Fix by ensuring the dev server is running and ADB reverse is set; use `npm run dev:android`.

## Release safety
- Do not enable production ads or analytics without explicit env keys and review.
- Ensure we never commit secrets (env files are git‑ignored by default).

