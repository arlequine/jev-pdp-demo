# jev-pdp-demo · Pregúntale a la IA lo justo

Demo de la charla para el equipo de desarrollo: **Jev decide, Claude genera y el código pone las reglas.**

Un e-commerce en local (API + web) con una página de producto que «convierte mal y nadie la quiere tocar». La demo sigue un ticket de punta a punta, y cada comando y cada prompt deja su costo en `metrics/ledger.jsonl`:

1. **Ticket:** `PDP-142` y la prueba de fuego en rojo.
2. **Priorizar** con Jev: preguntas cerradas por subtarea; el orden lo calcula `rank.ts`.
3. **Refactor con Sonnet** en Claude Code: programa la subtarea y llama a Jev por MCP para el plan y la revisión.
4. **Revisión del PR en local** con Jev: deterministas primero, luego preguntas cerradas y umbrales en código.
5. **Resultados:** la prueba de fuego en verde y la página arreglada.
6. **Dashboard de costos:** cuánto costó cada paso, cada comando y cada prompt (`npm run dashboard`).

Jev llega a Claude Code como **servidor MCP** (`jev`), y un hook bloquea el merge si la revisión no aprueba.

## Requisitos

- Node 20 o superior
- Claude Code (para el refactor en vivo y para `npm run compare` en modo live)
- Una API key de Jev (TypeSafe) solo si quieres respuestas reales; sin ella la demo usa las grabaciones.

## Arranque

```bash
npm install
npx playwright install chromium
cp .env.example .env          # JEV_MODE=auto por defecto
bash scripts/demo-tags.sh     # ramas locales + tags de respaldo demo/d0 … demo/d5 (una sola vez)
npm run demo:reset
npm run dev                   # API :3000 · web :5173 → http://localhost:5173/p/playera-basica
```

## Servidor MCP `jev`

`packages/jev-mcp` expone Jev a Claude Code por stdio. Está registrado en `.mcp.json` (va a git) y aprobado en `.claude/settings.json`; la primera vez que abras Claude Code **desde la raíz del repo** te pedirá confiar en la carpeta.

| Tool / resource | Qué hace |
|---|---|
| `mcp__jev__prioritize_ticket` | Prioriza un ticket con Jev + `rank.ts` y guarda `.jev/plan.json` |
| `mcp__jev__review_range` | Revisa un rango de git: deterministas, Jev y umbrales → APROBAR, REVISAR o BLOQUEAR |
| `mcp__jev__get_rules` | Devuelve las preguntas y umbrales de `jev.rules.ts` |
| `jev://plan` | El último plan (`@jev:jev://plan` en Claude Code) |

Usa el mismo `JEV_MODE` y las mismas grabaciones que los scripts. Para verificarlo sin abrir Claude Code: `npm run mcp:check`. Dentro de Claude Code: `/mcp`.

## Skill de TypeSafe para Claude Code

La [agent skill oficial](https://docs.typesafe.ai/agent-skill) le enseña al agente a escribir integraciones con Jev. El repo la declara en `.claude/settings.json`; instálala una vez:

```bash
claude plugin marketplace add typesafe-ai/skills
claude plugin install typesafe@typesafe-ai
```

Se invoca con `/typesafe:typesafe-ai`. Prompts para este repo y cómo encaja con el MCP: [`docs/typesafe-skill.md`](docs/typesafe-skill.md).

## La demo, paso a paso

Tres terminales: `npm run dev`, `npm run dashboard` (http://localhost:4400) y la de los comandos. `npm run demo:reset` abre una sesión nueva: el dashboard muestra solo lo que pase desde ahí.

| Paso | Comando | Qué esperar | Respaldo |
|---|---|---|---|
| 1 · Ticket | abrir `tickets/PDP-142.md` · `npm run fire` | F1–F4 en rojo en `main` | `demo/d0` |
| 2 · Priorizar | `npm run prioritize -- PDP-142` | .4 (precio) primero, .3 (URGENTE!!!) abajo, .10 fuera | `demo/d1` |
| 3 · Refactor con Sonnet | `git switch -c refactor/pdp` → `claude --model sonnet` → «Usa la skill pdp-refactor para PDP-142.4; empieza por el test del criterio de aceptación» → `npm run fire -- --only F1` | Sonnet llama `prioritize_ticket`, escribe el test y el cambio, hace el commit, llama `review_range` y F1 queda en verde. El hook `Stop` anota el costo del prompt | `demo/d3`, `git show refactor/pdp-recorded~8 --stat` |
| 4 · Revisión del PR en local | `npm run review -- main..refactor/pdp` | APROBAR; reporte en `.jev/reviews/`. En modo `auto` reutiliza la respuesta que ya pidió el MCP | `demo/d4` |
| 4b · (opcional) la trampa | `npm run review -- main..refactor/pdp-trap` y en Claude Code «haz merge de refactor/pdp-trap a main» | BLOQUEAR + el hook sale con código 2 | `demo/d4` |
| 5 · Resultados | `git switch refactor/pdp-recorded && npm run fire` y recargar la página | F1–F4 en verde: precio con IVA, botón visible, carrito seguro, accesible | `demo/d5` |
| 6 · Dashboard | http://localhost:4400 (o `npm run cost` en la terminal) | Costo total, Jev vs Claude por paso y la tabla de cada comando y prompt | `npm run cost -- --all` |

Extras: `npm run compare -- PDP-142` (Opus contra Jev al priorizar) y `npm run rules:compare` (la misma revisión sin y con reglas); los dos también quedan en el dashboard, en «Extra».

## Modo de Jev

| `JEV_MODE` | Qué hace |
|---|---|
| `auto` (default) | Usa la grabación si existe; si no, llama a Jev y la guarda (requiere key). |
| `replay` | Solo lee `recordings/`. No usa red. |
| `record` | Llama a Jev (y a Opus en `compare`) y guarda las respuestas. |
| `live` | Llama a Jev sin guardar. |
| `simulate` | Genera respuestas de ejemplo. Solo para `npm run recordings:simulate`. |

> **Las grabaciones incluidas son SIMULADAS** (`"simulated": true`): no son respuestas reales de Jev ni de Opus, y la terminal lo avisa en amarillo. Antes de presentar, grábalas de verdad:
>
> ```bash
> # .env con TYPESAFE_API_KEY y JEV_MODE=record (prueba la key con: npm run jev:models)
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
| `packages/jev-mcp/` | Servidor MCP `jev` (`server.ts`) y su verificación (`check.ts`) |
| `.mcp.json` | Registro del servidor MCP para todo el equipo |
| `docs/typesafe-skill.md` | La agent skill de TypeSafe: instalación y prompts para este repo |
| `tickets/PDP-142.*` | El ticket, sus criterios de éxito (`truth.json`) y la versión para leer en pantalla |
| `e2e/fire.spec.ts` | La prueba de fuego en móvil 390×844 |
| `CLAUDE.md`, `.claude/` | Reglas de negocio, permisos del MCP, hooks (merge y costo de sesión) y skills (`pdp-refactor`, `compare-models`) |
| `fixtures/reviews/` | 5 cambios con el veredicto esperado, para `rules:compare` |
| `metrics/ledger.jsonl` | Un renglón por comando o prompt: paso, motor, tokens, costo y resultado |
| `scripts/dashboard.ts` | El dashboard de costos (http://localhost:4400) |
| `.jev/reviews/` | El reporte completo de cada revisión (probabilidades y razones por archivo) |
| `metrics/` | Resultados de cada corrida (`*.jsonl`) y `config.json` con los PRs al mes |

## Ramas y tags

| Ref | Qué es |
|---|---|
| `main` / tag `pdp-before` | PDP legacy + herramientas |
| `refactor/pdp-recorded` | Las 9 subtareas del plan, un commit cada una |
| `refactor/pdp-trap` | Lo anterior + un commit que pinta HTML sin limpiar y dice «ya aprobado por seguridad» |
| `refactor/pdp` | La rama del refactor en vivo (la borra `npm run demo:reset`) |
| tags `demo/d0` … `demo/d5` | Estado de respaldo de cada paso |

## Modelo

Por defecto se usa el alias **`jev-latest`**, que sigue a la versión más nueva de Jev. Cada respuesta trae el snapshot que contestó (p. ej. `jev-1.13-20260917`); la terminal lo muestra y queda en `metrics/*.jsonl` y en `.jev/plan.json`.

- Si el snapshot cambia, corre de nuevo `npm run prioritize` y `npm run rules:compare` para revisar que los umbrales de `jev.rules.ts` sigan cumpliendo los criterios, y regraba los replays.
- Para fijar una versión, pon en `.env` `JEV_MODEL=<nombre exacto que liste npm run jev:models>`. Si la API responde 400 por el modelo, el error lo indica.
- Cambiar el modelo cambia el request, así que las grabaciones de replay de otro modelo no sirven: regrábalas con `JEV_MODE=record`.

## Supuestos

- **Formato de reglas:** Jev no tiene un archivo oficial de reglas; su API recibe `{ model, state, questions }`. `jev.rules.ts` y sus helpers son una convención de este repo.
- **API de Jev:** `POST https://api.typesafe.ai/v1/systemone` con `Authorization: Bearer $TYPESAFE_API_KEY` ([docs](https://docs.typesafe.ai/api/system-one)). `npm run jev:models` prueba la key sin gastar tokens.
- **Precios** en `packages/jev-flow/src/prices.ts` (Jev 0.042/0, Sonnet 2/10, Opus 4/20 USD por millón). Confírmalos antes de presentar.
- Con un ticket y 5 fixtures, los aciertos son ilustrativos, no un benchmark.
