#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-gam-trade-migration-check}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
DB_NAME="${DB_NAME:-gam_trade_migration_check}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/rust/infrastructure/db/migrations"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

cleanup
trap cleanup EXIT

docker run -d \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  "$POSTGRES_IMAGE" >/dev/null

until docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 1
done

docker exec "$CONTAINER_NAME" mkdir -p /tmp/migrations
docker cp "$MIGRATIONS_DIR/." "$CONTAINER_NAME:/tmp/migrations"

for migration in "$MIGRATIONS_DIR"/*.sql; do
  migration_path="/tmp/migrations/$(basename "$migration")"
  echo "Applying ${migration_path}"
  docker exec \
    -e PGPASSWORD="$DB_PASSWORD" \
    "$CONTAINER_NAME" \
    psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -f "$migration_path" >/dev/null
done

echo "Migration validation completed"
