# Drizzle + node-postgres for server persistence

`apps/server` talks to PostgreSQL via **Drizzle ORM** on the **`pg`** driver. Schema is TypeScript-first; migrations are generated SQL committed to the repo. Extends [ADR-0003](./0003-postgres-ledger.md).

**Ledger (v1):** mutable rows for **wallet**, **inventory**, and open **orders**; append-only **settlement** rows for audit. **Tick auction** matching runs in TypeScript (`packages/domain` for pure rules); each **global tick** wraps book read, match, and all writes in a single `db.transaction()`.

**Layout:** root `compose.yml` (Postgres 16); `apps/server/drizzle.config.ts`, `src/db/schema.ts`, `drizzle/*.sql`, `drizzle/down/*.down.sql`.

**Migrations (up):** edit schema → `pnpm --filter @fantasy-economy-sim/server db:generate` → review SQL → `db:migrate`. No `drizzle-kit push` on merged work.

**Migrations (down):** default dev reset — `docker compose down -v`, `docker compose up -d`, `db:migrate`. For non-trivial changes, add a paired script under `drizzle/down/` and run `pnpm --filter @fantasy-economy-sim/server db:migrate:down -- <file>`. Drizzle native rollback is not released yet ([drizzle-orm#2352](https://github.com/drizzle-team/drizzle-orm/issues/2352)).

**Tests:** local hacking uses Compose; DB integration tests use Testcontainers (`src/db/db.integration.test.ts`).

Rejected for v1: **Prisma** (heavy client, awkward multi-step tick transactions); **raw `pg` only** (CRUD boilerplate); **stored-procedure tick auction** (game logic in SQL); **`packages/db`** (no second consumer); **`drizzle-kit push`** as team workflow (schema drift).

Docs: [node-postgres](https://node-postgres.com/), [Drizzle ORM](https://orm.drizzle.team/docs/overview), [Transactions](https://orm.drizzle.team/docs/transactions), [Migrations](https://orm.drizzle.team/docs/migrations), [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/).
