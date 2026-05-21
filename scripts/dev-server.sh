#!/usr/bin/env bash
# Free the game server port, then start apps/server in watch mode.
set -euo pipefail

source "$(dirname "$0")/dev-common.sh"

dev_kill_port "${PORT:-3000}"

echo "Starting dev server (repo-root .env, port ${PORT:-3000})..."
exec env -u DATABASE_URL pnpm --filter @fantasy-economy-sim/server dev
