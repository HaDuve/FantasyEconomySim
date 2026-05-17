# Expo dev client + WebSocket tick sync

The React Native client uses **Expo with a development client** (not managed-only) so we can add native modules later while keeping Expo tooling. The **authoritative server** runs simulation (**global tick**, **ledger**, **market**); the phone never owns truth.

Each **global tick**, the server pushes state to connected clients over **WebSocket** (not polling): book snapshot, tick id, and the player's **wallet** / **inventory** / active **assignments**. Client actions (place **order**, **pool buy**, set **assignment**) go to the server as commands and are validated there.

Rejected for v1: poll-based sync (misaligned with 60s ticks, worse UX); bare React Native without Expo (slower iteration for a small team).

Confirm WebSocket and auth library choices against current [Expo](https://docs.expo.dev/) docs when implementing.
