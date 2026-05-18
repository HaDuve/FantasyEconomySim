# FantasyEconomySim

Multiplayer fantasy economy simulation. See [CONTEXT.md](./CONTEXT.md) for domain language and [AGENTS.md](./AGENTS.md) for agent workflow.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 9 (`corepack enable` recommended)

## Setup

```sh
pnpm install
cp .env.example .env
pnpm db:up
```

This links workspace packages: `packages/domain`, `apps/server`, and `apps/mobile`. Local Postgres runs in Docker on host port **5433** (see [ADR-0005](./docs/adr/0005-drizzle-pg-migrations.md)) so it does not conflict with another Postgres on 5432. If you already have a repo-root `.env` from an older setup, change `DATABASE_URL` to port **5433** and run `pnpm db:up` again.

`pnpm dev:server` loads repo-root `.env` automatically. If you previously exported `DATABASE_URL` in your shell, run `unset DATABASE_URL` or open a fresh terminal so `.env` is not overridden.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm typecheck` | TypeScript check in all workspaces |
| `pnpm test` | Run tests in all workspaces |
| `pnpm test:integration` | Server integration tests (Docker / Testcontainers) |
| `pnpm db:up` | Start local Postgres (`compose.yml`) |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm dev:server` | Start the game server |
| `pnpm dev:mobile` | Start Expo dev client |

## Apps

### Server (`apps/server`)

```sh
pnpm db:up
pnpm dev:server
```

Listens on `http://localhost:3000` by default. `GET /health` returns `{ ok: true, resourceCount: 8 }`.

**Manual ledger smoke test** (non-production dev routes):

```sh
curl -s http://localhost:3000/health

curl -s -X POST http://localhost:3000/dev/players \
  -H 'content-type: application/json' \
  -d '{"crowns": 100, "inventory": {"grain": 3, "ore": 1}}'

# Replace PLAYER_ID from the response:
curl -s http://localhost:3000/dev/players/PLAYER_ID/ledger
```

**Guest connect** (Firebase ID token; anonymous **guest** from the mobile client):

```sh
curl -s -X POST http://localhost:3000/auth/connect \
  -H "authorization: Bearer FIREBASE_ID_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"profession": "hunter"}'
```

Returns `{ playerId, crowns, inventory, workers, starterPackageGranted }`. First connect grants the **starter package** (100 **crowns**, empty **inventory**, one **worker**). Reconnect with the same token does not grant again. Set `FIREBASE_AUTH_DISABLED=true` only for local experiments without Firebase.

### Mobile (`apps/mobile`)

Expo **development client** scaffold (ADR-0001). Requires a dev build for native `expo-dev-client`; use Expo Go only for quick UI checks without custom native code.

`pnpm dev:mobile` builds `packages/domain` first, then starts Expo. Metro resolves `@fantasy-economy-sim/domain` from the workspace package (`dist/`), same as the server — run `pnpm install` at the repo root so the link exists.

```sh
pnpm dev:mobile
```

## Domain package

`packages/domain` holds shared types and constants: eight **resources**, `WalletCrowns` (**crown** in the **wallet**, not a **resource**), **starter trio** `ProfessionId` values, conversion **recipes**, and tick/command message shapes.
