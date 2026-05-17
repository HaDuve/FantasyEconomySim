# pnpm workspaces monorepo (M1)

The repo uses **pnpm workspaces** only (no Turborepo in v1). Layout: `apps/mobile`, `apps/server`, `packages/domain` (shared types and pure domain logic).

Shared code flows through `packages/domain`; apps depend on workspace packages via `workspace:*`. Add Turborepo later if CI build times become painful.

Rejected for v1: Turborepo upfront (extra config before we have multiple build targets); npm/yarn (team standardizes on pnpm for workspace hoisting and strict deps).

Confirm workspace config against current [pnpm workspace](https://pnpm.io/workspaces) docs when scaffolding.
