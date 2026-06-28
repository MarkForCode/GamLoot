#!/usr/bin/env bash
set -euo pipefail

required_files=(
  "docs/README.md"
  "docs/ai/README.md"
  "docs/ai/collaboration-rules.md"
  "docs/ai/context-map.md"
  "docs/ai/hooks.md"
  "docs/ai/maintenance.md"
  "docs/ai/skills/README.md"
  "docs/architecture/README.md"
  "docs/workflow/README.md"
  "docs/adr/README.md"
  "docs/adr/template.md"
  ".agent/hooks/README.md"
)

missing=0
for file in "${required_files[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "missing or empty: $file" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

if rg -n "\\b(TODO|TBD|FIXME|PLACEHOLDER)\\b" docs/ai docs/architecture docs/workflow docs/adr .agent --glob '!.agent/hooks/validate-docs.sh' >/tmp/gam-doc-check.txt; then
  echo "documentation contains unresolved markers:" >&2
  cat /tmp/gam-doc-check.txt >&2
  exit 1
fi

echo "documentation framework validation passed"
