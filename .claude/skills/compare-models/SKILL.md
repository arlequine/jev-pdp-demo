---
name: compare-models
description: Compara costo, tiempo de respuesta y aciertos al priorizar un ticket con Opus ("prompt y parseo") contra Jev + reglas en código. Úsala cuando pidan comparar Opus vs Jev o cuánto cuesta priorizar.
---

# Opus contra Jev al priorizar

1. Corre `npm run compare -- <TICKET>` (por defecto `PDP-142`). Usa `JEV_MODE=replay` si no hay red o no te dieron otra indicación.
   - El script prioriza con Jev (8 preguntas por subtarea + `rank.ts`) y le pide lo mismo a Opus con `claude -p --model opus --output-format json`.
   - En replay lee `recordings/jev/` y `recordings/claude-code/`. Si las grabaciones dicen `simulated: true`, dilo.
2. Muestra la tabla tal cual: costo a precio de lista, costo que reporta Claude Code, tiempo, tokens y criterios de éxito (`tickets/<TICKET>.truth.json`).
3. Resume en tres líneas: cuál fue más barato, cuál más rápido y cuál cumplió más criterios. Con un solo ticket, es ilustrativo, no un benchmark.
4. No inventes cifras: si un dato no está, di «sin dato».
