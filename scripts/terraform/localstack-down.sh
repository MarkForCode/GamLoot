#!/usr/bin/env bash
set -euo pipefail

docker compose -f docker-compose.localstack.yml down -v --remove-orphans
