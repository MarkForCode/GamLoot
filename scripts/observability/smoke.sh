#!/usr/bin/env bash
set -euo pipefail

wait_http() {
  local name="$1"
  local url="$2"
  local timeout="${3:-90}"
  local started

  started="$(date +%s)"
  while true; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "OK: $name"
      return 0
    fi

    if [ $(( "$(date +%s)" - started )) -ge "$timeout" ]; then
      echo "ERROR: $name not ready: $url" >&2
      return 1
    fi

    sleep 2
  done
}

echo "Checking APIs..."
wait_http "user-api health" "http://localhost:8080/health"
wait_http "cms-api health" "http://localhost:8081/health"
wait_http "user-api metrics" "http://localhost:8080/metrics"
wait_http "cms-api metrics" "http://localhost:8081/metrics"

echo "Checking observability services..."
wait_http "Grafana" "http://localhost:3002/api/health"
wait_http "Mimir" "http://localhost:9009/ready"
wait_http "Prometheus" "http://localhost:9090/-/ready"
wait_http "Loki" "http://localhost:3100/ready" 120
wait_http "Tempo" "http://localhost:3200/ready"
wait_http "Alloy" "http://localhost:12345/-/ready"

echo "Checking Mimir metrics..."
mimir_up="$(
  curl -fsS "http://localhost:9009/prometheus/api/v1/query?query=up" \
    | jq -r '.data.result[] | [.metric.job, .metric.instance, .value[1]] | @tsv'
)"
echo "$mimir_up"

for job in user-api cms-api prometheus alloy; do
  if ! grep -q "^${job}[[:space:]]" <<<"$mimir_up"; then
    echo "ERROR: Mimir is missing job: $job" >&2
    exit 1
  fi
done

echo "Checking Loki logs..."
for service in user-api cms-api; do
  curl -fsS "http://localhost:3100/loki/api/v1/query_range?query=%7Bservice%3D%22${service}%22%7D&limit=1" \
    | jq -e '.data.result | length > 0' >/dev/null
  echo "OK: Loki has ${service} logs"
done

echo "Observability smoke completed"
