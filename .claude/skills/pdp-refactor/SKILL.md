---
name: pdp-refactor
description: Ejecuta una subtarea del ticket PDP-142 sobre la página de detalle de producto, en el orden de .jev/plan.json, empezando por el test del criterio de aceptación. Úsala cuando pidan "haz PDP-142.N" o "sigue el plan".
---

# Refactor de la PDP, una subtarea a la vez

1. Llama la tool `prioritize_ticket` del servidor MCP `jev` con `PDP-142` (si ya existe `.jev/plan.json` de esta sesión, puedes leer el resource `jev://plan`). Lee también `tickets/PDP-142.json`. Si el MCP no está disponible, corre `npm run prioritize -- PDP-142`.
2. Toma la subtarea que te pidieron. Si no te dijeron cuál, la primera del plan que no tenga commit `PDP-142.N:` en `git log`.
3. Respeta las reglas de `CLAUDE.md`. En particular: dinero en centavos, IVA en la API, carrito `{ sku, quantity }`.
4. Si la subtarea tiene `acceptance`:
   - Escribe primero un test que lo compruebe (vitest junto al componente o al endpoint) y córrelo: **debe fallar**.
   - Haz el cambio mínimo para que pase.
5. Corre `npm run typecheck` y `npm test`. Si la subtarea toca algo que comprueba la prueba de fuego, corre `npm run fire -- --only F1` (o el check que corresponda) con `--headless`.
6. Haz un solo commit: `PDP-142.N: <qué cambia>`.
7. Llama la tool `review_range` con `main..HEAD` y reporta el veredicto. Si no es APROBAR, corrige lo que señala. No hagas merge ni push: el hook lo bloquea y la decisión es de una persona.
8. Al final, di en dos líneas qué cambió, qué check quedó en verde y el veredicto de la revisión.

## Mapa de la PDP

- `apps/api/src/server.ts` — endpoints. El IVA va aquí.
- `apps/web/src/ProductPage.tsx` — la página. Componentes nuevos en `apps/web/src/components/`.
- `e2e/fire.spec.ts` — la prueba de fuego (F1 precio, F2 botón, F3 carrito, F4 accesibilidad).
