#!/usr/bin/env bash
# Crea los tags de respaldo de la demo a partir de las ramas. Córrelo una vez después de clonar:
#   bash scripts/demo-tags.sh            # solo local
#   bash scripts/demo-tags.sh --push     # y los sube a origin
set -euo pipefail
cd "$(dirname "$0")/.."

git fetch -q origin main refactor/pdp-recorded refactor/pdp-trap 2>/dev/null || true
main=$(git rev-parse -q --verify origin/main || git rev-parse main)
rec=$(git rev-parse -q --verify origin/refactor/pdp-recorded || git rev-parse refactor/pdp-recorded)

git tag -f pdp-before "$(git rev-list --max-parents=0 "$main" | tail -1)" >/dev/null
for t in d0 d1 d2 d4; do git tag -f "demo/$t" "$main" >/dev/null; done
git tag -f demo/d3 "$rec~8" >/dev/null   # después del refactor en vivo de PDP-142.4
git tag -f demo/d5 "$rec" >/dev/null     # las 9 subtareas: prueba de fuego en verde

git tag -l "pdp-before" "demo/*" -n1
if [[ "${1:-}" == "--push" ]]; then git push -f origin pdp-before 'refs/tags/demo/*'; fi
