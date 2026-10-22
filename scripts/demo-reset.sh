#!/usr/bin/env bash
# Deja el repo como al inicio de la demo: en main, sin la rama del refactor en vivo.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain -- . ':!metrics' ':!.jev')" ]]; then
  echo "Hay cambios sin commit; los guardo en el stash «demo-reset»."
  git stash push -u -m "demo-reset" -- . ':!metrics' ':!.jev' >/dev/null
fi

git switch -q main
git branch -D refactor/pdp >/dev/null 2>&1 && echo "Borré la rama refactor/pdp del ensayo." || true
rm -f .jev/review-comment.md

echo "Listo: main, prueba de fuego en rojo. Siguiente: npm run dev"
echo "Modo de Jev: ${JEV_MODE:-replay} (cámbialo con export JEV_MODE=live|record|replay)"
