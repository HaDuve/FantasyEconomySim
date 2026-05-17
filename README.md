# FantasyEconomySim

Multiplayer fantasy economy simulation. See [CONTEXT.md](./CONTEXT.md) for domain language and [AGENTS.md](./AGENTS.md) for agent workflow.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 9 (`corepack enable` recommended)

## Setup

```sh
pnpm install
```

This links workspace packages: `packages/domain`, `apps/server`, and `apps/mobile`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm typecheck` | TypeScript check in all workspaces |
| `pnpm test` | Run tests in all workspaces |
| `pnpm dev:server` | Start the game server (health endpoint) |
| `pnpm dev:mobile` | Start Expo dev client |

## Apps

### Server (`apps/server`)

```sh
pnpm dev:server
```

Listens on `http://localhost:3000` by default. `GET /health` returns `{ ok: true, resourceCount: 8 }`.

### Mobile (`apps/mobile`)

Expo **development client** scaffold (ADR-0001). Requires a dev build for native `expo-dev-client`; use Expo Go only for quick UI checks without custom native code.

```sh
pnpm dev:mobile
```

## Domain package

`packages/domain` holds shared types and constants: eight **resources**, **crown** (not a resource), **starter trio** professions, conversion **recipes**, and tick/command message shapes.
