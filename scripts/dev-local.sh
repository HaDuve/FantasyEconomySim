#!/usr/bin/env bash
# Start local Postgres, free the dev server port, and run pnpm dev:server.
# Use RESET=1 (pnpm dev:reset) to wipe the Docker volume first.
set -euo pipefail

source "$(dirname "$0")/dev-common.sh"

dev_prepare

exec pnpm dev:server
