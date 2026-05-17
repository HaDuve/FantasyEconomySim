# Node/TypeScript server + Firebase Auth

The **authoritative server** is **Node.js + TypeScript** (`apps/server`). It owns **global tick** scheduling, the **market**, **ledger**, and all **production** resolution. Shared domain types live in `packages/` for client and server.

**Player** identity uses **Firebase Auth**: anonymous sign-in for **guest**, then **upgrade** by linking email/OAuth. Firebase validates tokens on the client; the game server verifies Firebase ID tokens and maps `uid` → internal **player** id.

Firebase Auth is **not** the game database — **wallet**, **inventory**, and **orders** persist in the server datastore (choice recorded separately when locked).

Confirm anonymous auth and account-linking flows in current [Firebase Auth docs](https://firebase.google.com/docs/auth) before implementation.
