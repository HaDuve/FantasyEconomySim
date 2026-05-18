# Design export (UX Pilot)

Static HTML mockups for layout and parchment styling reference only.

**Canonical spec:** [`../FANTASY-TRADER-UX.md`](../FANTASY-TRADER-UX.md) and [`CONTEXT.md`](../../../CONTEXT.md). HTML still shows known mock drift — do not copy labels or timings from these files:

- **Gold** / `g` → use **crown** (`CR`)
- Fantasy names (Iron Ore, Iron Bar, …) → eight **resource** ids in the spec
- **15-minute** tick copy → **global tick** is **60 seconds**
- Fictional starter bonuses, LVL, weight/storage caps

**Runtime:** pages load Tailwind, Font Awesome, Plotly, and Google Fonts from CDNs; some use external placeholder avatars. Offline use requires network; acceptable for visual reference only.

**Filenames:** truncated by the exporter (`Dashboar`, `Pro`, `S`, …) — see the inventory table in the parent spec.
