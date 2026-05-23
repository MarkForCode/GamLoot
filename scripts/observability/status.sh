#!/usr/bin/env bash
set -euo pipefail

docker compose ps user-api cms-api loki tempo mimir prometheus grafana alloy

echo
echo "Mimir up targets:"
curl -fsS "http://localhost:9009/prometheus/api/v1/query?query=up" \
  | jq -r '.data.result[] | [.metric.job, .metric.instance, .value[1]] | @tsv'
