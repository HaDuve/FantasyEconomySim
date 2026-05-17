# Resource catalog and currency options
_Exported on 17/05/2026 at 17:48:20 GMT+7 from Cursor (3.4.17)_

---

**User**

@CONTEXT.md 
Question 10 — Resource catalog (v1)

Which resources exist at launch? Pick a set (we’ll name professions / buildings to match).

Option	Resources
A. Minimal (4)
ore, grain, game, coin (coin = wallet only, not traded)
B. Standard (6)
ore, grain, game, lumber, herbs, scrolls
C. Fantasy (8)
ore, grain, game, lumber, herbs, scrolls, ingots, potions
D. Custom
List your v1 resources
Recommendation: B (6) — enough for Hunter (game), Mine (ore), Mill (grain), Sawmill (lumber), Herbalist (herbs), Scholar + Magic School (scrolls). Ingots/potions wait until you have smithy/alchemy buildings.

Question 10b — Wallet currency name

Option	Name
W1
crown (singular fantasy coin)
W2
gold (generic)
W3
Custom
Recommendation: W1 crown — distinct from tradeable resources; avoids “gold” the resource vs “gold” the currency.

Reply e.g. B + W1, or your picks.

>> Figure this out using web resources stuff like this:
eg: https://www.youtube.com/watch?v=L3YzoZwsWws https://www.reddit.com/r/gameideas/comments/8jbc7t/economic_simulation_in_a_fantasy_rpg_kingdom/ https://onixshu.com/blogs/articles/how-to-create-realistic-fantasy-economies-for-your-rpg-campaign 

>> goal is to have a complex economy but a consise minimal MVP version of this for now

---

**Cursor**

Reading CONTEXT.md and researching fantasy-economy MVP patterns to recommend resources and wallet currency.


## Recommendation: **B + W1**

**Tradeable resources (6):** `ore`, `grain`, `game`, `lumber`, `herbs`, `scrolls`  
**Wallet only:** `crown` (not a **resource**, not on the **market**)

That matches your stated grill mapping and what `CONTEXT.md` already implies for v1 production loops.

---

### Why not A or C for MVP

| Option | Verdict |
|--------|---------|
| **A (4)** | Too thin for “trader in a living economy.” Only three goods on the **market**; no lumber/herbs/scrolls lanes. Putting `coin` in the catalog fights your model: **wallet** is already separate from **inventory** (see glossary). |
| **C (8)** | Right *direction* for depth later, wrong *slice* now. `ingots` / `potions` are **tier‑2 processed** goods. They need conversion (ore→ingot, herbs→potion), extra **buildings**, and likely multi-step **assignments**—scope you have not locked in v1. |
| **B (6)** | One **resource** per clear production path, all tier‑1 outputs. Enough cross-commodity trading without recipe graphs. |

---

### How this lines up with your domain doc

`CONTEXT.md` already sketches:

- **Field work:** Hunter → `game`
- **Bound work:** Scholar + Magic School → `scrolls`
- Examples: Mine, **upkeep** / **facility fee** paid from **wallet**

Option **B** is the smallest set that covers **food** (`grain`, `game`), **industry inputs** (`ore`, `lumber`), **alchemy-adjacent** (`herbs`), and **magic/knowledge** (`scrolls`) without inventing processing rules yet.

Suggested v1 mapping (names can follow in professions/buildings):

| Resource | Production (v1) | Building / mode |
|----------|-----------------|-----------------|
| `game` | Hunter | **field work** |
| `grain` | Miller (or farmer) | Mill |
| `ore` | Miner | Mine (**private building**) |
| `lumber` | Sawyer | Sawmill |
| `herbs` | Herbalist | Herbalist shop / garden |
| `scrolls` | Scholar | Magic School (**public building**, **facility fee**) |

---

### What the web material supports

From [OnixShu’s fantasy economics piece](https://onixshu.com/blogs/articles/how-to-create-realistic-fantasy-economies-for-your-rpg-campaign):

1. **Separate currency from commodities** — wallet vs tradeable **resources**; avoid “gold” as both coin and good ([alternative currencies section](https://onixshu.com/blogs/articles/how-to-create-realistic-fantasy-economies-for-your-rpg-campaign)).
2. **Don’t simulate everything** — “focus on elements that enhance … decisions, not accounting exercises” (FAQ). Six fungible types + one **wallet** is enough for **tick auction** depth.
3. **Magic as its own economic lane** — scrolls (and herbs as inputs *later*) justify a distinct high-skill / facility-cost path, consistent with **truth/authentication** and specialized production in magical settings.
4. **Bulk vs luxury** — lumber/herbs/scrolls give different supply/drip and price stories without teleport-tier complexity.

Patterns from other sims (e.g. Mercatorio-style chains, Might & Fealty barter lanes): **MVP = raw/extractive goods**; **refined goods** come in v2 when you add smithy/alchemy and conversion.

The Reddit thread was not readable from here (403); the kingdom-sim pattern that still applies: start with **food + materials + one specialty good**, then add processing tiers when buildings exist.

---

### Why **crown** (W1), not **gold** (W2)

- **wallet** debits: **upkeep**, **facility fee**, **pool buy**, trade **settlements**
- **inventory** holds fungible **resources** only

`crown` is unambiguous in code, UI, and issues (`Wallet` balance in crowns). `gold` collides with player mental models (“gold ore? gold bars? GP?”) and with future commodities if you ever add a metal-named good.

---

### Expansion path (complex economy, still concise now)

Keep v1 as **six order books + crown**. Later, without renaming v1:

| Phase | Add | Unlocks |
|-------|-----|---------|
| v2 | `ingots`, Smithy | ore → ingot **assignment** / conversion |
| v2 | `potions`, Alchemy | herbs → potion |
| v3+ | gems, spices, favor tokens | regional or non-fungible systems (per OnixShu); likely not all on the global **market** in v1 style |

Document in `CONTEXT.md` when you lock this: row under **resource** with the six types; **wallet** = crowns; flag resolved for “Resource catalog”.

---

### Reply for the grill

```text
B + W1

Resources (market + inventory): ore, grain, game, lumber, herbs, scrolls
Wallet: crown (not a resource, not traded on the book)
Defer: ingots, potions → v2 with smithy/alchemy + conversion
```

**Open questions:**

- Exact **world drip** set: all six or subset at launch?
- **pool price** table and starter **inventory** per resource
- Is `grain` produced only via Mill, or also a small **world drip** safety net?
- Herbalist: **private building** like Mine, or **public** like Magic School?

---

**User**

i want there to be easy producable resources, leading to more complex and difficult to produce resources, which are the base for more complex and more magical resources, which finally can be used to create an unfair advantage, what ideas do we have for this?



> C + W1

---

**Cursor**

Reviewing CONTEXT.md to align tiered production ideas with your domain model and the C + W1 resource set.


**C + W1** is a solid spine for a ladder: eight tradeables plus **crown** in the **wallet** only. Below is a tier model that fits your tick trader loop (**field work** → **private building** → **public building** → scarce apex), then what “unfair advantage” can mean without breaking the **market**.

---

## Core design pattern: branches that merge

Use **four tiers** of fungible **resources**, then a **fifth layer** that is mostly *not* normal market goods.

```mermaid
flowchart TB
  subgraph T1["Tier 1 — Staples (easy)"]
    grain
    game
    lumber
  end
  subgraph T2["Tier 2 — Extractives (medium)"]
    ore
    herbs
  end
  subgraph T3["Tier 3 — Refined (hard)"]
    ingots
    potions
  end
  subgraph T4["Tier 4 — Arcane (scarce)"]
    scrolls
  end
  subgraph T5["Tier 5 — Advantage (v2+, mostly non-trade)"]
    apex["Charters / sigils / monopoly rights"]
  end
  grain --> potions
  game --> potions
  lumber --> scrolls
  ore --> ingots
  herbs --> potions
  ingots --> scrolls
  potions --> scrolls
  scrolls --> apex
```

Players can **trade** up the chain or **produce** up it; late tiers stay thin because of inputs, buildings, and fees—not because you simulate fifty items.

---

## Map **C + W1** onto tiers

| Tier | Resources | How it feels | Typical gate |
|------|-----------|--------------|--------------|
| **1 — Staples** | `grain`, `game`, `lumber` | High volume, forgiving | **field work** or cheap **private building**; stronger **world drip** / higher **pool** stock |
| **2 — Extractives** | `ore`, `herbs` | Steady but capex-heavy | **private building** + **bound worker** + **upkeep**; weaker drip (market matters) |
| **3 — Refined** | `ingots`, `potions` | Processing tax every **tick** | **assignment** consumes tier‑2 inputs (e.g. ore→ingots, herbs[+optional grain]→potions) |
| **4 — Arcane** | `scrolls` | Scarce, contested | **public building** + **facility fee** + **seat cap**; recipe may need tier‑3 *or* tier‑2 bundle |
| **5 — Advantage** | *(not in C)* | “Unfair” edge | See below—prefer **capabilities** or **non-fungible** rights, not a 9th commodity on the book |

**Wallet:** **crown** pays **upkeep**, **facility fee**, **pool buy**—never listed as a **resource**. That keeps tier 1–4 as the goods game and crowns as the lubricant ([OnixShu-style separation of currency vs commodities](https://onixshu.com/blogs/articles/how-to-create-realistic-fantasy-economies-for-your-rpg-campaign)).

---

## Difficulty knobs (same tier, different pain)

You do not need more **resource** types to make higher tiers harder—stack these:

| Knob | Tier 1 | Tier 4 |
|------|--------|--------|
| **Production mode** | **field work** | **bound worker** in **public building** |
| **Capital** | Hunter only | Mine + Smithy + Magic School seat |
| **Opex / tick** | Low **upkeep** | **upkeep** + **facility fee** |
| **Scarcity** | Generous **world drip** | No drip (or tiny drip) on `scrolls` |
| **Inputs** | None | Multi-input **assignment** (ore per ingot; herbs per potion; lumber+herbs per scroll) |
| **Yield** | 1.0× | 0.2–0.5× per **global tick** |
| **Competition** | Many can copy | **seat cap** = 1 Scholar per player per school |

That gives you “easy to produce” vs “magical” without fifty SKUs.

---

## Suggested recipes (v1-shaped, still simple)

One input per output keeps the **ledger** boring in a good way; add a second input only where it teaches a chain.

| Output | Inputs (per tick) | Building / worker |
|--------|-------------------|-------------------|
| `game` | — | Hunter (**field work**) |
| `grain` | — | Miller / Farm (Mill) |
| `lumber` | — | Sawyer (Sawmill) |
| `ore` | — | Miner (Mine) |
| `herbs` | — | Herbalist |
| `ingots` | 2 `ore` → 1 `ingot` | Smith (Smithy) |
| `potions` | 2 `herbs` + 1 `grain` → 1 `potion` | Alchemist (Alchemy) — grain = stabilizer |
| `scrolls` | 1 `ingot` + 1 `potion` + 1 `lumber` → 1 `scroll` | Scholar (Magic School) |

Branches:

- **Industrial:** `lumber` + `ore` → `ingots`
- **Alchemy:** `herbs` (+ `grain`) → `potions`
- **Arcane:** merges both + `lumber` (parchment/frame) → `scrolls`

Traders arbitrage broken chains (cheap ore + cheap herbs → expensive scrolls). Producers verticalize when **upkeep** + fees still beat buy-and-resell.

---

## Tier 5: “unfair advantage” (ideas that fit a trader sim)

“Apex” should feel **unfair** because it changes *rules of engagement*, not only because it sells for more crowns. Strong options:

### A. **Non-tradeable rights** (best fit for “unfair”)

| Asset | How you get it | Advantage |
|-------|----------------|-----------|
| **Royal charter** | Burn X `scrolls` + crowns (world sink) | −50% **facility fee** or +1 effective **seat cap** in one **public building** |
| **Guild patent** | Top producer of `ingots` for N ticks | Exclusive **assignment** (only you can run “masterwork ingots” this season) |
| **Monopoly license** | Auction each season (crowns + scrolls bid) | Only license holder may **produce** `potions` from Alchemy (others must buy) |

Not on the **market** → no order book manipulation; still economic warfare.

### B. **Tradeable apex goods (v2 resources)**

If you want a 9th–10th fungible later:

| Resource | Chain | Advantage when held / used |
|----------|-------|----------------------------|
| **essence** | `potions` + `scrolls` → essence (Archmage, 1 seat) | Craft **sigil** (consumable) |
| **sigil** | essence + `ingots` | One-tick **market** perk: see depth-2 book, or cancel without fee, or +10% **production** next tick |
| **war engine** | many `ingots` + `lumber` | Future PvP/world event (if you add map later) |

Keep these **low drip**, no **pool buy**, or pool at punishing **pool price** so advantage stays earned.

### C. **Economic moats without new items**

Already in your model:

- Permanent **seat** in Magic School during peak hours
- Cornering `scrolls` supply before a rules change
- Vertical stack: Mine → Smithy → scroll pipeline with lower effective cost than traders

“Unfair” = compounding **production** + **information** + **scarcity**, not one more ore type.

### D. **Magic that respects fantasy econ**

From [OnixShu](https://onixshu.com/blogs/articles/how-to-create-realistic-fantasy-economies-for-your-rpg-campaign): creation magic breaks farms unless limited. So apex effects should be **bounded**:

- Divination scroll → reveals aggregate volume traded last tick (not live hidden orders)
- Transmute license → convert 1 `ingot` ↔ 1 `potion` once per day (arb sink, not infinite gold)

---

## MVP vs full ladder (with **C + W1** locked)

| Phase | Catalog | Processing | Apex |
|-------|---------|------------|------|
| **MVP slice** | All 8 in data model | Tier 1–2 live first; add ingot/potion/scroll recipes in order | None—scrolls are the “win” good |
| **v1 full (C)** | All 8 tradeable | Full table above | Scroll hoarding + public seat = soft advantage |
| **v2** | + `essence` / charters | Multi-building chains | Patents, charters, seasonal monopoly auction |

For “complex economy, concise MVP”: **ship all eight names early**, but **enable production in waves** (staples → extractives → refine → arcane). The **market** can list all eight from day one with different **world drip** curves so tier 4 is expensive before anyone can make it.

---

## Naming / professions (aligned to tiers)

| Tier | Professions | Buildings |
|------|-------------|-----------|
| 1 | Hunter, Miller, Sawyer | — / Mill / Sawmill |
| 2 | Miner, Herbalist | Mine, Herbalist |
| 3 | Smith, Alchemist | Smithy, Alchemy |
| 4 | Scholar | Magic School (**public**) |
| 5 | Court agent, Archmage | Registry / Archmage Spire (**public**, 1 global seat?) |

---

## Practical grill answers (if you want to lock next)

1. **Are `ingots` and `potions` producer-only at launch, or also in **world drip**?** (Recommend: drip tier 1–2 only; tier 3+ player-made.)
2. **Do assignments consume inventory same tick as yield?** (Recommend: yes—creates real input markets.)
3. **Is tier 5 a new **resource** or a new term (e.g. **privilege**)?** (Recommend: **privilege** off-book; keeps “unfair” out of price–time priority.)
4. **Scroll recipe: merge branch (ingot+potion+lumber) or scholar-only with high fee?** Merge teaches the ladder; scholar-only is simpler code.

---

**Short answer:** With **C + W1**, treat `grain` / `game` / `lumber` as easy staples, `ore` / `herbs` as extractives, `ingots` / `potions` as refined gates, `scrolls` as the magical capstone. Save “unfair advantage” for **privileges** (charters, seats, patents) or a tiny v2 apex (`essence` → sigils), not more bulk goods on the global **market**.

If you want, next step is one chosen scroll recipe + whether tier 5 is **privilege** vs **essence**—that decides how much conversion logic v1 needs.

---

**User**

add swords (regular and magical) knights (regular and paladins) and monsters (regular and dangerous) into this economy

---

**Cursor**

Here’s how **swords**, **knights**, and **monsters** can plug into the **C + W1** ladder and your trader-first sim—without turning v1 into an action RPG.

---

## Design principle: economy first, combat abstract

`CONTEXT.md` v1: players **trade**, run **production**, pay **upkeep**—no map avatars. So:

| Thing | Model as | On the **market**? |
|-------|----------|-------------------|
| **Swords** (both kinds) | **resource** | Yes (fungible) |
| **Knights** / **Paladins** | **profession** + **worker** | No (like Hunter, Miner) |
| **Monsters** (both kinds) | **world threat** / **contract** | No (events, not inventory SKUs) |

Monsters drive **demand** and **risk**; knights are **capacity** you hire; swords are **goods** you make, buy, or lose.

---

## Extended tier ladder (military branch)

Merge with the earlier chain:

```mermaid
flowchart TB
  subgraph T1["Tier 1 — Staples"]
    grain
    game
    lumber
  end
  subgraph T2["Tier 2 — Extractives"]
    ore
    herbs
  end
  subgraph T3["Tier 3 — Refined"]
    ingots
    potions
  end
  subgraph T3b["Tier 3b — Arms"]
    sword["sword"]
    msword["enchanted sword"]
  end
  subgraph T4["Tier 4 — Arcane"]
    scrolls
  end
  subgraph T5["Tier 5 — Force"]
    kn["knight service"]
    pal["paladin service"]
  end
  ore --> ingots
  ingots --> sword
  lumber --> sword
  sword --> msword
  scrolls --> msword
  potions --> msword
  ingots --> kn
  sword --> kn
  msword --> pal
  potions --> pal
  scrolls --> pal
  kn --> hunt
  pal --> hunt
  hunt["monster contracts / world drip protection"]
```

**New tradeables (add to catalog after C):**

| Resource | Tier | Recipe idea (per **global tick**) |
|----------|------|-----------------------------------|
| **sword** | 3b | 2 `ingots` + 1 `lumber` → 1 **sword** (Smithy: “arms” **assignment**) |
| **enchanted sword** | 4 | 1 **sword** + 1 `potion` + 1 `scroll` → 1 **enchanted sword** (Smithy + Arcane bench, or Scholar-assisted **assignment**) |

Regular vs magical swords are **two order books**, same as `ingots` vs `potions`—traders can flip arms without ever hiring a knight.

---

## Knights and paladins: professions, not goods

Treat like **Hunter** / **Miner**—they cost **crowns** (**upkeep**) and optionally consume **resources** each tick.

| **profession** | Type | Needs | Role in economy |
|----------------|------|-------|-----------------|
| **Knight** | **bound worker** (Barracks **private building**) | **upkeep** + 1 **sword** equipped (one-time or per N ticks) | Fights **regular monsters** |
| **Paladin** | **bound worker** (Chapterhouse **public building**, **facility fee**, **seat cap**) | **upkeep** + 1 **enchanted sword** + steady `potions`/`grain` | Fights **dangerous monsters** |

**Regular vs paladin** = difficulty gate + opex, not two knight tokens on the market.

Optional **field** variant (v2): **Squire** — cheap, can’t clear dangerous threats; only escorts caravans if you add trade risk later.

**Equipment sink:** On failed contract or “attrition” tick, destroy 1 **sword** / **enchanted sword** from inventory—keeps arms demand alive ([adventurer-problem](https://onixshu.com/blogs/articles/how-to-create-realistic-fantasy-economies-for-your-rpg-campaign) fix: wealth leaves as broken gear, not infinite pool gold).

---

## Monsters: world pressure, not a resource type

**Regular monster** and **dangerous monster** are **threat tiers**, not fungible **resources**.

### What they do each **global tick**

| Threat | Spawn / pressure | If unaddressed | If addressed (contract) |
|--------|------------------|----------------|-------------------------|
| **Regular monster** | World rolls N incidents / tick | −**production** on one staple (**world drip** or player **assignment** −X%) | **Knight** **assignment**: “Patrol” |
| **Dangerous monster** | Rare; tied to season or scroll-hoard meta | Hits **public building** uptime, +**facility fee**, or pauses a **seat** | **Paladin** **assignment**: “Slay” |

No map: UI shows **active threats** (region tags or abstract “Marches / Deepwood / Ruins”) and lets players post **contracts** or assign knights.

### Loot (keep fungible loot modest)

| Monster tier | Knight required | Loot (to **inventory** or **supply pool**) |
|--------------|-----------------|---------------------------------------------|
| Regular | Knight | Small `game` / `ore` / **crowns** (tax bounty), sometimes 0 |
| Dangerous | Paladin | `herbs`, rare **scroll** shard, or burst **world drip** reduction next tick |

Avoid “one kill = year of village gold.” Prefer **bounties paid in crowns** from a world treasury sink, plus **materials** that feed T1–T2, not chests of crowns.

### “Monster parts” (optional v2 resource)

If you want monsters on the **market**:

- **beast parts** (regular) ← regular hunts  
- **heartstone** (dangerous) ← paladin hunts → input for **enchanted sword**  

Only add if you need another trade lane; otherwise bounties + existing catalog are enough.

---

## How this connects to “unfair advantage”

| Layer | Unfair edge |
|-------|-------------|
| **enchanted sword** supply | Vertical arms + arcane stack |
| **Paladin** + Chapterhouse **seat** | Only viable vs dangerous → unlocks best bounties / protects your **assignments** |
| **Charter** (tier 5 **privilege**) | “Royal Hunt” — your knights don’t lose **swords** on fail; or +1 patrol slot |
| **Monopoly** on Barracks tier | Season auction: only winner trains Knights this week |

Magical swords are **tradeable** power; paladins + seats are **structural** power—same split as scrolls vs Magic School.

---

## Tick order (fits your loop)

Each **global tick**, server could run:

1. **world drip** → **supply pool**  
2. **Monster pressure** apply (debuffs if unresolved)  
3. **field work** + **assignments** (incl. Mine → ingots → swords, Patrol, Slay)  
4. **Knight/Paladin upkeep** + equipment consumption  
5. **upkeep** / **facility fee**  
6. Resolve **contracts** / bounties → **wallet** + loot **inventory**  
7. **tick auction** → **settlements**  

Knights consume swords *before* the market clears so broken gear can’t be sold the same tick.

---

## Catalog growth summary

| Category | v1 (C + W1) | Add for military layer |
|----------|-------------|-------------------------|
| **resources** | 8 + crown | + **sword**, **enchanted sword** (10 tradeables + crown) |
| **professions** | Hunter, Miner, … | + **Knight**, **Paladin** |
| **buildings** | Mine, Magic School, … | + **Barracks** (private), **Chapterhouse** (public) |
| **world** | drip, pool | + **threat roster**, **bounties**, patrol/slay **assignments** |

Optional later: **beast parts** / **heartstone**, **Squire**, regional markets.

---

## MVP slice (still “concise”)

Ship in waves so economy depth doesn’t explode day one:

1. **sword** production + market only (demand via NPC **pool** buy floor or fake “garrison demand”)  
2. **Knight** + **regular monster** debuff/bounty loop  
3. **enchanted sword** + **Paladin** + **dangerous monster**  
4. **privileges** (charters) tied to paladin seasons  

---

## Terms for `CONTEXT.md` (when you document)

| Term | Definition sketch |
|------|-------------------|
| **sword** | Tier-3b arms **resource** from **ingots** + **lumber**. |
| **enchanted sword** | Tier-4 arms **resource**; needs **sword**, **potion**, **scroll**. |
| **Knight** | **bound worker** in **Barracks**; clears **regular monster** pressure. |
| **Paladin** | **bound worker** in **Chapterhouse**; clears **dangerous monster** pressure. |
| **monster pressure** | Per-tick world debuff until a matching patrol/slay **assignment** succeeds. |
| **bounty** | **Wallet** payment + loot table on successful slay/patrol. |

---

## Open decisions

1. **Are swords consumed every tick or only on failed patrol?** (Failures-only is kinder to traders.)  
2. **Can traders profit without ever hiring knights?** (Recommend yes—arms flipping is valid; knights are producers/defenders.)  
3. **Do monsters affect all players globally or per-player estates?** (Global = shared world drama; per-player = solo management sim.)  
4. **Paladin in public Chapterhouse only, or also private chapel?** (Public = **seat cap** drama fits multiplayer.)

If you say global vs per-player threats and whether equipment breaks on fail, the military branch can be locked as cleanly as **C + W1**.

