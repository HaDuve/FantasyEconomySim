#!/usr/bin/env bash
# Postgres + game server + Drizzle Studio; opens https://local.drizzle.studio
set -euo pipefail

source "$(dirname "$0")/dev-common.sh"

STUDIO_PORT="${STUDIO_PORT:-4983}"
STUDIO_URL="${STUDIO_URL:-https://local.drizzle.studio}"

SERVER_PID=""
STUDIO_PID=""

cleanup() {
  local code=$?
  for pid in "${STUDIO_PID}" "${SERVER_PID}"; do
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
    fi
  done
  exit "${code}"
}

trap cleanup EXIT INT TERM

dev_prepare
dev_kill_port "${STUDIO_PORT}"

echo "Starting dev server (repo-root .env, port ${PORT:-3000})..."
env -u DATABASE_URL pnpm dev:server &
SERVER_PID=$!

echo "Starting Drizzle Studio (backend port ${STUDIO_PORT})..."
env -u DATABASE_URL pnpm --filter @fantasy-economy-sim/server db:studio &
STUDIO_PID=$!

echo "Waiting for Drizzle Studio..."
for _ in $(seq 1 50); do
  if lsof -t -i ":${STUDIO_PORT}" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "${STUDIO_PID}" 2>/dev/null; then
    echo "Drizzle Studio exited before listening on port ${STUDIO_PORT}." >&2
    exit 1
  fi
  sleep 0.2
done

if ! lsof -t -i ":${STUDIO_PORT}" >/dev/null 2>&1; then
  echo "Timed out waiting for Drizzle Studio on port ${STUDIO_PORT}." >&2
  exit 1
fi

echo "Opening ${STUDIO_URL}..."
dev_open_url "${STUDIO_URL}"

wait "${SERVER_PID}" "${STUDIO_PID}"
