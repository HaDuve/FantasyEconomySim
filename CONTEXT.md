# Domain Glossary — FantasyEconomySim

Shared language for agents and humans. Expand via `/grill-with-docs` as decisions land.

## Product

| Term | Definition |
| --- | --- |
| **world** | The shared simulation space all connected players inhabit. |
| **tick** | One authoritative simulation step; economy and world state advance per tick. |
| **player** | A connected client with an identity, inventory, and economic presence in the world. |

## Economy (initial — refine in grilling)

| Term | Definition |
| --- | --- |
| **resource** | A fungible good with a type (e.g. ore, grain) and quantity. |
| **market** | A venue where buy/sell orders for resources are matched. |
| **order** | An intent to buy or sell a resource at a price (or best available). |
| **ledger** | Authoritative record of balances, trades, and settlements. |

## Multiplayer (initial — refine in grilling)

| Term | Definition |
| --- | --- |
| **authoritative server** | Server that owns simulation truth; clients predict or display only. |
| **session** | A bounded play period from connect to disconnect for one player. |

## Conventions

- Prefer these terms in code (`Tick`, `Order`, `Ledger`), issues, and ADRs.
- When introducing a new term, add a row here in the same PR that uses it.
