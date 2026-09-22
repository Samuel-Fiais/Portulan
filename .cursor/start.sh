#!/usr/bin/env bash
# Per-boot startup for Portulan: bring up PostgreSQL and the local Neon HTTP
# proxy, then return. The Next.js dev server runs as a terminal (see
# environment.json), which starts after this script completes.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PG_VER="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -1)"

# --- PostgreSQL (idempotent) ---------------------------------------------
sudo pg_ctlcluster "$PG_VER" main start || true
for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then break; fi
  sleep 1
done

# --- Local Neon HTTP proxy ------------------------------------------------
if ! curl -sf http://127.0.0.1:4444/health >/dev/null 2>&1; then
  echo "[start] Starting local Neon HTTP proxy on :4444..."
  PG_CONNECTION_STRING="postgres://postgres:postgres@127.0.0.1:5432/portulan" \
  PORT=4444 \
    nohup node scripts/neon-local-proxy/server.mjs > /tmp/neon-local-proxy.log 2>&1 &
  for _ in $(seq 1 30); do
    if curl -sf http://127.0.0.1:4444/health >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi

echo "[start] PostgreSQL and Neon proxy are up."
