# FantasyEconomySim — Agent Guide

Multiplayer fantasy economy simulation. Treat this repo like a AAA game codebase: align before building, small vertical slices, strong feedback loops, and deliberate architecture.

## Agent skills

Matt Pocock engineering skills are installed under `.agents/skills/` (see [mattpocock/skills](https://github.com/mattpocock/skills)). Invoke with `/` in Agent chat (e.g. `/grill-with-docs`, `/tdd`, `/setup-matt-pocock-skills`).

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage role → label mapping. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at repo root and `docs/adr/`. See `docs/agents/domain.md`.

## Recommended workflow

| Phase | Skill | When |
| --- | --- | --- |
| Align | `/grill-with-docs` | Before any non-trivial feature or system design |
| Spec | `/to-prd` | After alignment, to capture a PRD as a GitHub issue |
| Decompose | `/to-issues` | Break PRDs/plans into vertical-slice issues |
| Build | `/tdd` | Implementation with red-green-refactor |
| Debug | `/diagnose` | Bugs, regressions, perf issues |
| Architecture | `/improve-codebase-architecture` | Periodic deepening / module consolidation |
| Orient | `/zoom-out` | Unfamiliar code areas |
| Handoff | `/handoff` | Session boundaries between agents |

Productivity: `/grill-me` (no docs), `/caveman` (compressed replies), `/prototype` (throwaway sims/UI variants).

## Engineering standards

- **Ubiquitous language**: Use terms from `CONTEXT.md` in code, issues, and ADRs.
- **Vertical slices**: Each issue should be independently shippable end-to-end.
- **Feedback loops**: Types, tests, and runnable checks before expanding scope.
- **ADRs**: Record non-obvious architectural decisions under `docs/adr/`.

## Repo layout (initial)

```
/
├── AGENTS.md          ← this file
├── CONTEXT.md         ← domain glossary (grows via /grill-with-docs)
├── docs/
│   ├── agents/        ← skill configuration
│   └── adr/           ← architecture decision records
├── .agents/skills/    ← Matt Pocock skills (skills-lock.json pins versions)
└── src/               ← application code (TBD)
```
