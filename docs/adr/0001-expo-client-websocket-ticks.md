# Expo dev client + WebSocket tick sync

The React Native client uses **Expo with a development client** (not managed-only) so we can add native modules later while keeping Expo tooling. The **authoritative server** runs simulation (**global tick**, **ledger**, **market**); the phone never owns truth.

Each **global tick**, the server pushes state to connected clients over **WebSocket** (not polling): book snapshot, tick id, and the player's **wallet** / **inventory** / active **assignments**. Client actions (place **order**, **pool buy**, set **assignment**) go to the server as commands and are validated there.

Rejected for v1: poll-based sync (misaligned with 60s ticks, worse UX); bare React Native without Expo (slower iteration for a small team).

**WebSocket libraries (confirmed May 2026):**

- **Server** (`apps/server`): [`ws`](https://github.com/websockets/ws) v8.x on the Node HTTP `upgrade` path (`/sync`). Standard choice for attaching to `node:http`; actively maintained (8.20.x).
- **Client** (Expo / React Native, future): use the runtime WebSocket API or a client library recommended in current [Expo networking docs](https://docs.expo.dev/) when the mobile slice lands ([#22](https://github.com/HaDuve/FantasyEconomySim/issues/22) for real Firebase tokens on device).
