#!/usr/bin/env bash
set -euo pipefail

docker compose stop alloy grafana prometheus mimir tempo loki
