# Firebase dev setup (issue #22)

FantasyEconomySim uses **Firebase Authentication only** (anonymous guest + future account upgrade). Game state lives in **PostgreSQL** ([ADR-0002](./adr/0002-node-server-firebase-auth.md), [ADR-0003](./adr/0003-postgres-ledger.md)). You do **not** need Firestore, Realtime Database, or Storage.

## One-time console setup

1. Create a Firebase project for **dev** ([Firebase console](https://console.firebase.google.com/)).
2. **Authentication** → **Sign-in method** → enable **Anonymous**.
3. **Project settings** → **Service accounts** → **Generate new private key** (JSON). Store outside the repo.
4. **Project settings** → **Your apps** → add a **Web** app → copy the client config object.

## Local repo config

```sh
cp .env.example .env
cp firebaseConfig.example.json firebaseConfig.json
```

Fill `.env` (see comments in `.env.example`):

- `GOOGLE_APPLICATION_CREDENTIALS` — absolute path to the Admin SDK JSON key.
- `EXPO_PUBLIC_FIREBASE_*` — Web app config fields (for mobile #12 later).
- Optional: `FIREBASE_AUTH_DISABLED=true` to use `Bearer dev:<uid>` without Firebase.

`firebaseConfig.json` is gitignored; never commit keys or service account JSON.

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

Anonymous ID token (from repo root; uses root `firebase` package):

```sh
TOKEN=$(node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
const cfg = JSON.parse(readFileSync('firebaseConfig.json', 'utf8'));
const auth = getAuth(initializeApp(cfg));
const { user } = await signInAnonymously(auth);
console.log(await user.getIdToken());
")
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

## Troubleshooting

| Symptom | Fix |
| -------- | ----- |
| `Cannot find package 'pg'` | `pnpm install` at repo root |
| `401 invalid_token` | Wrong service account project vs `firebaseConfig.json`; or expired JWT |
| Anonymous sign-in fails | Enable Anonymous in Firebase console |
