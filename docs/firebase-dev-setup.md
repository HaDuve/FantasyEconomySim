# Firebase dev setup (issue #22)

FantasyEconomySim uses **Firebase Authentication only** (anonymous guest + future account upgrade). Game state lives in **PostgreSQL** ([ADR-0002](./adr/0002-node-server-firebase-auth.md), [ADR-0003](./adr/0003-postgres-ledger.md)). You do **not** need Firestore, Realtime Database, or Storage.

## One-time console setup

1. Create a Firebase project for **dev** ([Firebase console](https://console.firebase.google.com/)).
2. **Authentication** → **Sign-in method** → enable **Anonymous**.
3. **Project settings** → **Service accounts** → **Generate new private key** (JSON). Store outside the repo.
4. **Project settings** → **Your apps** → add a **Web** app → copy the client config object (used for curl smoke tests and Expo).

You do **not** need to register separate iOS/Android Firebase apps for v1 mobile auth (see [Expo / #12](#expo--12-mobile-client) below).

## Local repo config

```sh
cp .env.example .env
cp firebaseConfig.example.json firebaseConfig.json
```

Fill `.env` (see `.env.example`):

- `GOOGLE_APPLICATION_CREDENTIALS` — absolute path to the Admin SDK JSON key (server `verifyIdToken`).
- `EXPO_PUBLIC_FIREBASE_*` — Web app config fields (Expo reads these via `apps/mobile/app.config.ts`).
- Optional: `FIREBASE_AUTH_DISABLED=true` to use `Bearer dev:<uid>` without Firebase.

`firebaseConfig.json` is gitignored (curl / `pnpm firebase:anon-token` only). Never commit service account JSON.

## Expo / #12 (mobile client)

**Approach:** Firebase **JS SDK** on Expo ([Expo Firebase guide](https://docs.expo.dev/guides/using-firebase/)) — same Web app config as the server smoke test. No native `google-services.json` or `GoogleService-Info.plist` in v1.

| Item | Location |
| --- | --- |
| Env vars | Repo root `.env` — `EXPO_PUBLIC_FIREBASE_*` |
| Expo config bridge | [`apps/mobile/app.config.ts`](../apps/mobile/app.config.ts) — loads root `.env`, sets `extra.firebase` |
| Env → config (tested) | [`apps/mobile/src/config/firebase-env.ts`](../apps/mobile/src/config/firebase-env.ts) |
| Runtime init (slice #12) | `apps/mobile/src/config/firebase.ts` (TBD) — `initializeApp` from `extra.firebase` or `firebaseConfigFromEnv()` |

When slice **#12** lands, `expo start` from `apps/mobile` will expose config via `expo-constants`:

```ts
import Constants from "expo-constants";
const firebase = Constants.expoConfig?.extra?.firebase;
```

**If you later adopt React Native Firebase** (`@react-native-firebase/*`): register iOS and Android apps in the console, download gitignored copies to:

- `apps/mobile/google-services.json`
- `apps/mobile/GoogleService-Info.plist`

and add the RN Firebase config plugins to `app.config.ts` (see [rnfirebase.io](https://rnfirebase.io/#managed-workflow)).

## E2E smoke test (real Firebase token)

```sh
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev:server
```

Health:

```sh
curl -s http://localhost:3000/health
```

Anonymous ID token (repo root; requires `firebaseConfig.json`):

```sh
TOKEN=$(pnpm firebase:anon-token)
```

Connect:

```sh
curl -s -X POST http://localhost:3000/auth/connect \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"profession": "hunter"}'
```

Expect `starterPackageGranted: true`, 100 crowns, one hunter worker. Reconnect with the same token: same `playerId`, `starterPackageGranted: true` (player flag), no second starter grant (crowns may drop if a global tick charged upkeep).

## Dev bypass (no Firebase)

```sh
# .env
FIREBASE_AUTH_DISABLED=true
```

```sh
curl -s -X POST http://localhost:3000/auth/connect \
  -H "authorization: Bearer dev:local-guest-1" \
  -H 'content-type: application/json' \
  -d '{"profession": "hunter"}'
```

## CI strategy

- **Default CI:** keep `FIREBASE_AUTH_DISABLED=true` (or dev verifier) in integration tests — no shared Firebase project or secrets in GitHub Actions.
- **Optional manual / nightly:** shared dev project + `GOOGLE_APPLICATION_CREDENTIALS` secret for a real-token E2E job.
- **Auth emulator:** possible later for isolated CI; not wired in this repo yet.

## Troubleshooting

| Symptom | Fix |
| -------- | ----- |
| `Cannot find package 'pg'` | `pnpm install` at repo root |
| `401 invalid_token` | Wrong service account project vs `firebaseConfig.json`; or expired JWT |
| Anonymous sign-in fails | Enable Anonymous in Firebase console |
