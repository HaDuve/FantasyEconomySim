# Paired down migrations

Drizzle Kit does not ship `migrate:down` yet. For non-trivial schema changes, add a hand-written `NNNN_description.down.sql` here that reverses the matching file in `../`.

Run:

```bash
pnpm --filter @fantasy-economy-sim/server db:migrate:down -- drizzle/down/NNNN_description.down.sql
```

For day-to-day dev, prefer resetting the database:

```bash
docker compose down -v && docker compose up -d
pnpm --filter @fantasy-economy-sim/server db:migrate
```

See [ADR-0005](../../../docs/adr/0005-drizzle-pg-migrations.md).
