# PostgreSQL for game state

All authoritative state — **ledger**, open **orders**, **inventory**, **wallet**, **buildings**, **assignments**, tick history — lives in **PostgreSQL** accessed only from `apps/server`.

**Tick auction** and **settlements** run in database transactions so **partial fills** and balance updates stay consistent. Firebase Auth `uid` maps to an internal `player_id`; Postgres holds gameplay rows.

Rejected for v1: Firestore (weak fit for relational order book + tick transactions); SQLite (dev-only unless explicitly scoped).

Confirm driver/ORM choice in a follow-up ADR or PR; use current [PostgreSQL](https://www.postgresql.org/docs/) and Node client docs at implementation time.
