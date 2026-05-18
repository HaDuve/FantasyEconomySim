# Shared local dev setup (source from dev-local.sh / dev-studio.sh).
dev_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.."
}

dev_kill_port() {
  local port="$1"
  if pids=$(lsof -t -i ":${port}" 2>/dev/null); then
    echo "Stopping process on port ${port}..."
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
    sleep 0.5
  fi
}

dev_prepare() {
  dev_repo_root

  if [[ "${RESET:-0}" == "1" ]]; then
    echo "Resetting Postgres (docker compose down -v)..."
    docker compose down -v
  fi

  echo "Starting Postgres..."
  docker compose up -d --wait

  dev_kill_port "${PORT:-3000}"
}

dev_open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "${url}"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${url}"
  else
    echo "Open in your browser: ${url}"
  fi
}
