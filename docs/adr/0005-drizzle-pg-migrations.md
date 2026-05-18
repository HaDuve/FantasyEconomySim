# Drizzle + node-postgres for server persistence

`apps/server` talks to PostgreSQL via **Drizzle ORM** on the **`pg`** driver. Schema is TypeScript-first; migrations are generated SQL committed to the repo. Extends [ADR-0003](./0003-postgres-ledger.md).

**Ledger (v1):** mutable rows for **wallet**, **inventory**, and open **orders**; append-only **settlement** rows for audit. **Tick auction** matching runs in TypeScript (`packages/domain` for pure rules); each **global tick** wraps book read, match, and all writes in a single `db.transaction()`.

**Layout:** root `compose.yml` (Postgres 16); `apps/server/drizzle.config.ts`, `src/db/schema.ts`, `drizzle/*.sql`, `drizzle/down/*.down.sql`.

**Local Postgres:** `compose.yml` maps host **5433** → container 5432 (`fes` / `fes` / `fes_dev`). Default 5432 is avoided so dev machines with another Postgres install can run both. `DATABASE_URL` in repo-root `.env` must use port 5433.

**Env loading:** `src/db/env.ts` (`loadRepoEnv`) loads repo-root `.env` for `drizzle.config.ts`, `db:migrate:down`, and `pnpm dev:server` (`src/index.ts`). Dotenv does not override variables already set in the shell — unset a stale `DATABASE_URL` if migrations hit the wrong host.

**Migrations (up):** edit schema → `pnpm --filter @fantasy-economy-sim/server db:generate` → review SQL → `db:migrate`. No `drizzle-kit push` on merged work. `pnpm dev:server` runs migrations on startup.

**Migrations (down):** default dev reset — `docker compose down -v`, `pnpm db:up`, `db:migrate`. For non-trivial changes, add a paired script under `drizzle/down/` and run `db:migrate:down -- <file>`. Drizzle native rollback is not released yet ([drizzle-orm#2352](https://github.com/drizzle-team/drizzle-orm/issues/2352)).

**Tests:** `pnpm test` (unit only). `pnpm test:integration` requires a Docker engine (Testcontainers; fails fast if unavailable). CI runs both. Local Postgres hacking uses `compose.yml`.

Rejected for v1: **Prisma** (heavy client, awkward multi-step tick transactions); **raw `pg` only** (CRUD boilerplate); **stored-procedure tick auction** (game logic in SQL); **`packages/db`** (no second consumer); **`drizzle-kit push`** as team workflow (schema drift).

Docs: [node-postgres](https://node-postgres.com/), [Drizzle ORM](https://orm.drizzle.team/docs/overview), [Transactions](https://orm.drizzle.team/docs/transactions), [Migrations](https://orm.drizzle.team/docs/migrations), [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/).
