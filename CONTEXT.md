# Domain Glossary — FantasyEconomySim

Shared language for agents and humans. Expand via `/grill-with-docs` as decisions land.

Fantasy economy simulation where players act as **market traders** in a shared world. State advances on discrete **ticks**; there is little or no avatar movement in v1.

## Product

| Term            | Definition                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **world**       | The shared simulation space all connected players inhabit.                                                               |
| **tick**        | One authoritative simulation step; all **markets** match **orders** and apply **settlements** on the same beat.          |
| **global tick** | A **tick** on the shared world clock; one every **60 seconds** for all players and markets.                              |
| **player**      | A persistent identity with **inventory** and **wallet**; may start as **guest** and later **upgrade** to a full account. |
| **guest**       | Anonymous **player** with server-issued id; progress kept server-side; can **upgrade** without reset.                    |
| **upgrade**     | Linking a **guest** to an authenticated account (email/OAuth); retains **wallet** and **inventory**.                     |
| **session**     | A bounded play period from connect to disconnect for one player.                                                         |

### Session loop (v1)

Players **browse markets**, **place/cancel orders**, and manage **inventory** and **wallet**. No meaningful avatar or map navigation in v1.

_Avoid_: calling the player a "character" or "avatar" in product copy for v1.

## Economy

| Term                    | Definition                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **resource**            | A fungible good with a type; held in **inventory** and traded on the **market**.                                                 |
| **crown**               | Currency in the **wallet** only; pays **upkeep**, **facility fee**, **pool buy**, and trade **settlements**. Not a **resource**. |
| **wallet**              | A player's balance of **crowns**.                                                                                                |
| **market**              | The single global venue where all **resource** types are matched each **global tick**.                                           |
| **order**               | A limit buy or sell for a **resource** at a stated price; **GTC** until filled or cancelled.                                     |
| **tick auction**        | Matching pass that runs once per **global tick**; no mid-tick execution.                                                         |
| **partial fill**        | When an **order** matches only part of its quantity; the remainder stays open on the book.                                       |
| **price–time priority** | Per **resource**, best price wins; at equal price, earlier **order** wins.                                                       |
| **GTC**                 | Good-til-cancelled — an **order** stays on the book until fully filled or explicitly cancelled.                                  |
| **ledger**              | Authoritative economic state: current **wallet**, **inventory**, and open **orders**, plus an immutable history of **settlements**. |
| **inventory**           | A player's held **resources** by type and quantity.                                                                              |
| **settlement**          | Application of a matched trade to **wallet** and **inventory** on the **ledger**.                                                |
| **supply pool**         | World-owned stock of **resources** replenished by **world drip**; sold via **pool buy**.                                         |
| **world drip**          | Each **global tick**, the server adds quantity of selected **resources** to the **supply pool** (tier 1–2 only in v1).           |
| **pool price**          | Fixed **crown** cost per unit for **pool buy** of a **resource** from the **supply pool**.                                       |
| **pool buy**            | Instant purchase from the **supply pool** at **pool price**; debits **wallet**, credits **inventory** (not a player **order**).  |
| **building**            | A named structure where **bound workers** run **assignments**; **private building** or **public building**.                      |
| **private building**    | A **building** owned by one **player** (e.g. Mine, Barracks).                                                                    |
| **public building**     | A world **building** any eligible **worker** may use (e.g. Magic School); charges a **facility fee** per **global tick**.        |
| **production**          | Yield of **resources** into **inventory** each **global tick** from **field work** and/or **assignments**.                       |
| **assignment**          | What a **building** produces next tick; requires a compatible **bound worker** and may consume **resources** as inputs.          |
| **conversion**          | An **assignment** that consumes input **resources** same tick to yield output **resources**.                                     |
| **worker**              | A hired **profession**; costs **upkeep** in **crowns** each **global tick**.                                                     |
| **profession**          | Role of a **worker** (e.g. Hunter, Scholar, Knight); determines eligible work.                                                   |
| **field work**          | **Production** by a **field worker** with no **building**.                                                                       |
| **field worker**        | A **profession** that runs **field work** only (e.g. Hunter).                                                                    |
| **bound worker**        | A **profession** that must be in a matching **building** to run an **assignment**.                                               |
| **facility fee**        | **Crown** cost per **global tick** to use a **public building** (in addition to **upkeep**).                                     |
| **seat cap**            | Per **player** limit on **bound workers** in a **public building** (v1: **1** per building per **global tick**).                 |
| **upkeep**              | **Crown** debit per **global tick** per employed **worker**.                                                                     |
| **starter package**     | What a new **player** receives once on first connect (see below).                                                                |

### Resource catalog (v1 tradeables)

Eight **resources** on the **market**; **crown** is never listed.

| Resource  | Tier         | Role                     |
| --------- | ------------ | ------------------------ |
| `grain`   | 1 staple     | Food / stabilizer        |
| `game`    | 1 staple     | Food (hunting)           |
| `lumber`  | 1 staple     | Construction / parchment |
| `ore`     | 2 extractive | Industrial input         |
| `herbs`   | 2 extractive | Alchemy input            |
| `ingots`  | 3 refined    | Processed metal          |
| `potions` | 3 refined    | Processed alchemy        |
| `scrolls` | 4 arcane     | Capstone knowledge good  |

_Avoid_: `gold` as currency name (use **crown**). _Avoid_: treating **crown** as a **resource**.

### Production tiers (v1 targets)

| Tier          | Resources                 | Typical gate                                                          |
| ------------- | ------------------------- | --------------------------------------------------------------------- |
| 1 staples     | `grain`, `game`, `lumber` | **field work** or cheap **private building**; stronger **world drip** |
| 2 extractives | `ore`, `herbs`            | **private building** + **bound worker**                               |
| 3 refined     | `ingots`, `potions`       | **conversion** **assignments** (inputs consumed same tick)            |
| 4 arcane      | `scrolls`                 | **public building** + **facility fee** + multi-input **conversion**   |

### Conversion recipes (v1)

| Output    | Inputs (per **global tick**)                     | Building / worker                  |
| --------- | ------------------------------------------------ | ---------------------------------- |
| `game`    | —                                                | Hunter (**field work**)            |
| `grain`   | —                                                | Miller (Mill)                      |
| `lumber`  | —                                                | Sawyer (Sawmill)                   |
| `ore`     | —                                                | Miner (Mine)                       |
| `herbs`   | —                                                | Herbalist                          |
| `ingots`  | 2 `ore` → 1 `ingot`                              | Smith (Smithy)                     |
| `potions` | 2 `herbs` + 1 `grain` → 1 `potion`               | Alchemist (Alchemy)                |
| `scrolls` | 1 `ingot` + 1 `potion` + 1 `lumber` → 1 `scroll` | Scholar (Magic School, **public**) |

**World drip** (v1): tier 1–2 **resources** only; tier 3+ are player-made.

### Starter package (v1)

**Balanced but poor** — enough to learn, not enough to skip the **market**.

| Grant         | Amount                                                           |
| ------------- | ---------------------------------------------------------------- |
| **crowns**    | 100                                                              |
| **inventory** | none                                                             |
| **workers**   | 1 × **profession** chosen from **starter trio** (see below)      |
| **buildings** | none (first **private building** must be bought with **crowns**) |

100 **crowns** ≈ a few **pool buy** staples or one entry **private building** (80 **crowns**), with ~20 left for **upkeep** / trade.

| **private building** | **crown** cost (v1) | **profession** | Output                         |
| -------------------- | ------------------- | -------------- | ------------------------------ |
| Herbalist shop       | 80                  | Herbalist      | `herbs`                        |
| Mine                 | 80                  | Miner          | `ore`                          |
| Mill                 | 100                 | Miller         | `grain`                        |
| Sawmill              | 100                 | Sawyer         | `lumber`                       |
| Smithy               | 150                 | Smith          | `ingots` (via **conversion**)  |
| Alchemy              | 150                 | Alchemist      | `potions` (via **conversion**) |

_Higher-tier buildings cost more; exact table subject to **numeric tuning**._

**Starter trio** (pick one at onboarding):

| Profession | Type             | First step                                            |
| ---------- | ---------------- | ----------------------------------------------------- |
| Hunter     | **field worker** | **field work** → `game` immediately (no **building**) |
| Miner      | **bound worker** | buy Mine, then **assignment** → `ore`                 |
| Herbalist  | **bound worker** | buy Herbalist shop, then **assignment** → `herbs`     |

### Scarcity and price ladder (v1)

All tiers and **conversions** are live at launch. Higher tiers are **rarer** (lower **world drip**, lower **assignment** yield, higher input cost) and **more expensive** on the **market** (higher typical **order** prices and **pool price** where applicable).

| Tier          | Rarity knob                             | Price knob                            |
| ------------- | --------------------------------------- | ------------------------------------- |
| 1 staples     | Highest **world drip**; highest yields  | Lowest **pool price** / baseline book |
| 2 extractives | Moderate drip                           | Mid prices                            |
| 3 refined     | No drip; **conversion** tax             | High prices                           |
| 4 arcane      | No drip; multi-input + **facility fee** | Highest prices                        |

### Expansion (documented, not v1 scope)

Military / advantage layer from brainstorming — see `docs/brainstorming/cursor_resource_catalog_and_currency_op.md`:

| Add later                   | Model as                                                            |
| --------------------------- | ------------------------------------------------------------------- |
| `sword`, `enchanted sword`  | **resources** (arms branch)                                         |
| Knight, Paladin             | **professions** / **bound workers**                                 |
| regular / dangerous monster | **monster pressure** (world debuff + **bounty**), not **resources** |
| charters, patents           | **privilege** (off **market**)                                      |

## Multiplayer

| Term                     | Definition                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| **authoritative server** | Server that owns simulation truth; the React Native client displays and submits intents only. |
| **session**              | See Product — same term.                                                                      |

## Relationships

- A **player** has one **wallet** (**crowns**) and one **inventory** (**resources** only).
- A **market** accepts **orders** on all eight **resources**; each **global tick**, **tick auction** → **settlements**.
- **Production policy (v1):** all tier **assignments** and **conversions** enabled at launch; scarcity is economic (drip/yield/fees/prices), not feature-gated waves.
- Each **global tick** (order): **world drip** → **supply pool** → **field work** / **assignments** (incl. **conversions**) → **upkeep** + **facility fees** → **tick auction**.
- **Field workers** produce alone; **bound workers** need a compatible **building**.
- Each **player**: one **seat cap** per **public building** per **global tick**.
- New **players** (including **guest**): **starter package** once on first connect; choose one **starter trio** **profession**.
- **Guest** → **upgrade** keeps the same **player** id and **ledger** state.
- The **ledger** holds live balances and the book; each **settlement** from a **tick auction** is retained as history (balances and open **orders** are updated in place).

## Example dialogue

> **Dev:** "Can I sell crowns on the market?"
> **Domain expert:** "No — **crowns** live in the **wallet** only."
>
> **Dev:** "Can a Scholar produce scrolls without a building?"
> **Domain expert:** "No — Scholar is **bound** to Magic School."
>
> **Dev:** "Does the pool sell ingots?"
> **Domain expert:** "Only tier 1–2 via **world drip**; **ingots** come from **conversion**."

## Flagged ambiguities

- **Numeric tuning** — exact **world drip**, **pool price**, and yield tables per tier (TBD).
- **Military layer** — global vs per-player **monster pressure**; equipment loss on fail (TBD).

## Conventions

- Prefer glossary terms in code (`Tick`, `Order`, `Crown`, `Wallet`), issues, and ADRs.
- When introducing a new term, add a row here in the same PR that uses it.
