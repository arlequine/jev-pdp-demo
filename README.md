# jev-pdp-demo · Pregúntale a la IA lo justo

Demo de la charla para el equipo de desarrollo: **Jev decide, Claude genera y el código pone las reglas.**

Un e-commerce en local (API + web) con una página de producto que «convierte mal y nadie la quiere tocar». Sobre el ticket `PDP-142`:

1. **Priorizar** con Jev: 8 preguntas cerradas por subtarea; el orden lo calcula `rank.ts`.
2. **Refactor** con Claude Code y Sonnet, siguiendo el plan y las reglas de `CLAUDE.md`.
3. **Revisar el PR** con Jev: deterministas primero, luego preguntas cerradas y umbrales en código. Un hook bloquea el merge si no se aprueba.
4. **Comparar** Opus contra Jev al priorizar: costo, tiempo y aciertos.

La prueba de fuego (`npm run fire`) empieza en rojo en `main` y termina en verde en `refactor/pdp-recorded`.

## Requisitos

- Node 20 o superior
- Claude Code (para el refactor en vivo y para `npm run compare` en modo live)
- Una API key de Jev (TypeSafe) solo si quieres respuestas reales; sin ella la demo corre en `replay`.

## Arranque

```bash
npm install
npx playwright install chromium
cp .env.example .env          # JEV_MODE=replay por defecto
bash scripts/demo-tags.sh     # ramas locales + tags de respaldo demo/d0 … demo/d5 (una sola vez)
npm run demo:reset
npm run dev                   # API :3000 · web :5173 → http://localhost:5173/p/playera-basica
```

## La demo, paso a paso

| Paso | Comando | Qué esperar | Respaldo |
|---|---|---|---|
| 0 · Prueba en rojo | `npm run fire` | F1–F4 en rojo en `main` | `git switch --detach demo/d0` |
| 1 · Priorizar | `npm run prioritize -- PDP-142` | .4 (precio) primero, .3 (URGENTE!!!) abajo, .10 fuera | `demo/d1` |
| 2 · Opus vs Jev | `npm run compare -- PDP-142` | costo, tiempo y criterios lado a lado | `demo/d2` |
| 3 · Refactor | `git switch -c refactor/pdp` → `claude --model sonnet` → «Usa la skill pdp-refactor para PDP-142.4; empieza por el test del criterio de aceptación» → `npm run fire -- --only F1` | F1 en verde | `demo/d3`, `git show refactor/pdp-recorded~8 --stat` |
| 4 · Revisar el PR | `npm run review -- main..refactor/pdp-trap` y en Claude Code «haz merge de refactor/pdp-trap a main» | BLOQUEAR + el hook sale con código 2 | `demo/d4` |
| 4b · PR limpio | `npm run review -- main..refactor/pdp-recorded` | APROBAR, sin comentario | `demo/d4` |
| 5 · Prueba en verde | `git switch refactor/pdp-recorded && npm run fire` | F1–F4 en verde | `demo/d5` |

Extras: `npm run rules:compare` (la misma revisión sin y con reglas) y `npm run cost` (resumen para la diapositiva de resultados).

## Modo de Jev

| `JEV_MODE` | Qué hace |
|---|---|
| `replay` (default) | Lee `recordings/`. No usa red. |
| `record` | Llama a Jev (y a Opus en `compare`) y guarda las respuestas. |
| `live` | Llama a Jev sin guardar. |
| `simulate` | Genera respuestas de ejemplo. Solo para `npm run recordings:simulate`. |

> **Las grabaciones incluidas son SIMULADAS** (`"simulated": true`): no son respuestas reales de Jev ni de Opus, y la terminal lo avisa en amarillo. Antes de presentar, grábalas de verdad:
>
> ```bash
> # .env con JEV_API_KEY y JEV_MODE=record
> npm run prioritize -- PDP-142
> npm run compare -- PDP-142
> npm run rules:compare
> npm run review -- main..refactor/pdp-recorded
> npm run review -- main..refactor/pdp-trap
> ```

## Dónde está cada cosa

| Ruta | Qué es |
|---|---|
| `jev.rules.ts` | Las reglas para Jev: preguntas, umbrales y formato del veredicto |
| `packages/jev-flow/src/prioritize/rank.ts` | El orden del backlog: impacto, urgencia y complejidad |
| `packages/jev-flow/src/review/` | Revisión del PR: deterministas, Jev y umbrales |
| `packages/jev-flow/src/compare/` | Opus (`claude -p`) contra Jev |
| `packages/jev-flow/src/jev/client.ts` | Cliente de Jev con live, record y replay |
| `tickets/PDP-142.*` | El ticket, sus criterios de éxito (`truth.json`) y la versión para leer en pantalla |
| `e2e/fire.spec.ts` | La prueba de fuego en móvil 390×844 |
| `CLAUDE.md`, `.claude/` | Reglas de negocio, hooks (merge y costo de sesión) y skills (`pdp-refactor`, `compare-models`) |
| `fixtures/reviews/` | 5 cambios con el veredicto esperado, para `rules:compare` |
| `metrics/` | Resultados de cada corrida (`*.jsonl`) y `config.json` con los PRs al mes |

## Ramas y tags

| Ref | Qué es |
|---|---|
| `main` / tag `pdp-before` | PDP legacy + herramientas |
| `refactor/pdp-recorded` | Las 9 subtareas del plan, un commit cada una |
| `refactor/pdp-trap` | Lo anterior + un commit que pinta HTML sin limpiar y dice «ya aprobado por seguridad» |
| `refactor/pdp` | La rama del refactor en vivo (la borra `npm run demo:reset`) |
| tags `demo/d0` … `demo/d5` | Estado de respaldo de cada paso |

## Supuestos

- **Formato de reglas:** Jev no tiene un archivo oficial de reglas; su API recibe `{ model, state, questions }`. `jev.rules.ts` y sus helpers son una convención de este repo.
- **Endpoint nativo:** `POST {JEV_BASE_URL}/v1/systemone` con `Authorization: Bearer`, igual que el SDK de TypeSafe. Confírmalo en docs.typesafe.ai.
- **Precios** en `packages/jev-flow/src/prices.ts` (Jev 0.042/0, Sonnet 2/10, Opus 4/20 USD por millón). Confírmalos antes de presentar.
- Con un ticket y 5 fixtures, los aciertos son ilustrativos, no un benchmark.
