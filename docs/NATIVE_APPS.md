# Store apps (iOS and Android)

Two store apps are built from this repository. Each one is a [Capacitor](https://capacitorjs.com) shell around the same React app, with its own native projects, icons, bundle ID and Supabase project. The PWA on the web keeps working unchanged (`yarn build:karlsruhe` / `yarn build:munich`).

| | Roundnet Karlsruhe | Munich Roundnet |
|---|---|---|
| Vite mode / `CAP_TENANT` | `karlsruhe` | `munich` |
| Bundle ID / package | `de.roundnet.hub.karlsruhe` | `de.roundnet.hub.munich` |
| Native projects | `native/karlsruhe/{ios,android}` | `native/munich/{ios,android}` |
| Icon and splash sources | `tenants/karlsruhe/assets` | `tenants/munich/assets` |
| Web host (deep links) | `roundnet-karlsruhe.web.app` | `munich-roundnet.web.app` |

## How it works

- `VITE_NATIVE=true` (see `build:native:*`) builds the web app without the service worker and with `base: '/'`. The output goes to `build-native/<tenant>` and is copied into the native project by `cap sync`.
- `capacitor.config.ts` needs `CAP_TENANT` so a command can never touch the wrong app. The `cap:sync:*` scripts set it.
- `src/native/init.ts` hides the splash screen, sets the status bar, handles the Android back button and opens universal links inside the app. It does nothing in the browser.
- Push: the web uses Web Push, the store apps use APNs (iOS) and FCM (Android). Tokens are stored in `notifications.web_push_subscriptions` with `kind = 'apns' | 'fcm'` and sent by the `push-worker` edge function. The system permission prompt is only shown when the user taps "Enable" in *Profile → Notifications*.

## Daily commands

```bash
yarn cap:sync:karlsruhe          # build the web bundle and copy it into native/karlsruhe
yarn cap:sync:munich
CAP_TENANT=karlsruhe npx cap open ios       # Xcode
CAP_TENANT=karlsruhe npx cap open android   # Android Studio
```

Regenerate icons and splash screens after changing `tenants/<tenant>/assets`:

```bash
npx capacitor-assets generate --assetPath tenants/karlsruhe/assets \
  --iosProject native/karlsruhe/ios/App --androidProject native/karlsruhe/android \
  --iconBackgroundColor '#ffffff' --splashBackgroundColor '#0e876c' --splashBackgroundColorDark '#0e876c'
```

The tool also writes PWA files (`icons/`, `public/manifest.webmanifest`); delete them again.

> The current icons are upscaled from 512 px sources. Replace `tenants/<tenant>/assets/icon-only.png` with a real 1024×1024 PNG **without transparency** (Apple rejects alpha) and `splash.png` (2732×2732) before submitting.

## One-time setup (needs the developer accounts)

### Apple
1. App Store Connect → Apps → **+** → create both apps with the bundle IDs above (name "Roundnet Karlsruhe" / "Munich Roundnet", primary language German).
2. Open each project in Xcode (`cap open ios`) and select your team under *Signing & Capabilities*. Push Notifications and Associated Domains are already in `App.entitlements`; Xcode registers them on the App ID.
3. Developer portal → Keys → create **one** key with *Apple Push Notifications service (APNs)*. Keep the `.p8`, the key ID and your team ID.
4. Set these secrets on **each tenant's Supabase project** (`supabase secrets set … --project-ref <ref>`):
   `APNS_KEY_P8` (file content, `\n` for line breaks is fine), `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` (that tenant's bundle ID) and `APNS_ENV` (`production` for TestFlight and App Store, `sandbox` only for Xcode debug runs).
5. Universal links: host `https://<web host>/.well-known/apple-app-site-association` (no extension, `application/json`) with
   `{"applinks":{"details":[{"appIDs":["<TEAMID>.<bundle id>"],"components":[{"/":"/*"}]}]}}`.

### Google
1. Play Console → create both apps (package names above). Use Play App Signing and create an upload keystore per app: `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`.
2. Firebase console → add one Android app per package (one Firebase project may hold both). Download `google-services.json` into `native/<tenant>/android/app/` (git-ignored by the Android template) or into the `GOOGLE_SERVICES_JSON_B64` secret.
3. Firebase → Project settings → Service accounts → generate a key and set the whole JSON as `FCM_SERVICE_ACCOUNT` on the matching Supabase project. Never commit it (`service-account*.json` is git-ignored).
4. App links: host `https://<web host>/.well-known/assetlinks.json` with the package name and the **Play App Signing** SHA-256 fingerprint (Play Console → App integrity).

### GitHub (per environment "Roundnet Karlsruhe" / "Munich Roundnet")
Existing variables and secrets are reused. Add `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` and `GOOGLE_SERVICES_JSON_B64`. Run the *Native apps* workflow to get a signed `.aab` per tenant. The iOS job is an unsigned compile check; archive and upload from Xcode (Product → Archive) until certificates are automated.

### Supabase (every project, staging and production)
Apply the new migrations (`20261106080000` … `20261106100000`) and deploy `delete-account` and `push-worker`. Delete the old `management-proxy` function if it was ever deployed. Rotate the key that used to be `supabase/functions/service-account.json`.

## Before every submission

- Bump the version: iOS in Xcode (`MARKETING_VERSION`, build number), Android via `VERSION_NAME` / `VERSION_CODE` (CI uses the run number).
- Test the release build on a real iPhone and Android phone: login, push, delete account, report/block a comment, deep link, photo upload.
- Fill `LEGAL.email` in `src/tenant/config.ts` first. Imprint, privacy policy and terms must be reachable without login: `https://<web host>/legal/imprint`, `/legal/privacy`, `/legal/terms`.

## Review requirements and answers

**Review notes** (both stores; create a demo account per tenant in that tenant's Supabase project):
> The app is a community app for roundnet clubs. Sign in with the demo account below. Event comments are user generated content: every comment can be reported and its author blocked, reported content is reviewed by moderators, and accounts can be deleted in Profile → Account → Delete account.
> Demo account: `<email>` / `<password>`

**Guideline 1.2 (user generated content)** is covered by: terms acceptance at sign-up (and for existing users via the terms gate), report button, block button, a moderation screen with removal, and a contact address in the imprint. The "within 24 hours" promise in the terms is an operational commitment.

**Guideline 5.1.1(v) / Play account deletion**: in-app deletion anonymises the account. For Play's Data Safety form also give a web URL for deletion requests (a page or the support email) and state what is kept (anonymised comments and match history).

**Privacy labels / Data Safety** (verify against what you really collect): contact info (email, name), user content (comments, photos), identifiers (user ID, device ID for push), diagnostics (Sentry). Data is linked to the user, not used for tracking, no ads. Data is encrypted in transit.

**Export compliance**: `ITSAppUsesNonExemptEncryption = false` is set (only standard HTTPS).

**Age rating**: answer "user generated content: yes"; expect a rating around 12+.

## Risks to plan for

- **Apple 4.3 (duplicate apps)**: both apps share one code base. Different name, icon, colours, content and community per app help; mention the two separate clubs in the review notes.
- **Google closed testing**: new personal accounts must run a closed test with at least 12 testers for 14 days **per app** before production access.
- **DSA trader status**: Apple and Google publish the address from the legal notice for trader accounts.
- The legal texts in `LegalPage.tsx` are drafts and not legal advice; have them checked.
- Not yet built or run here: no Xcode or Android SDK was available. Do a first build of both native projects on a machine that has them.
