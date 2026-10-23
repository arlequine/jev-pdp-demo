# La agent skill de TypeSafe en este repo

La skill oficial de TypeSafe ([docs.typesafe.ai/agent-skill](https://docs.typesafe.ai/agent-skill)) le da a Claude Code contexto sobre la API de Jev: primitivas, patrones y cómo evaluar. **Sirve para escribir y mejorar integraciones**, no para ejecutarlas.

| Pieza | Para qué |
|---|---|
| Skill `typesafe-ai` (plugin `typesafe@typesafe-ai`) | Que el agente sepa **cómo** escribir preguntas, umbrales e integraciones con Jev |
| Servidor MCP `jev` (`packages/jev-mcp`) | Que el agente **use** nuestras reglas: priorizar y revisar |
| `jev.rules.ts` | Preguntas y umbrales en un solo archivo, como recomienda la skill |
| Hook `PreToolUse` | Bloquear el merge aunque el agente no use nada de lo anterior |

## Instalar (una vez por persona)

El repo ya declara el marketplace y el plugin en `.claude/settings.json`, pero un plugin de GitHub se instala una vez por persona:

```bash
claude plugin marketplace add typesafe-ai/skills
claude plugin install typesafe@typesafe-ai
```

Reinicia Claude Code o corre `/reload-plugins`. Para actualizarla:

```bash
claude plugin marketplace update typesafe-ai
claude plugin update typesafe@typesafe-ai
```

Si el agente inventa campos de request o respuesta, la skill está vieja: actualízala.

## Prompts para este repo

Invoca la skill con `/typesafe:typesafe-ai` y luego el prompt. Usa **modo plan** (Shift+Tab) para que proponga antes de tocar código.

### 1. Descubrir dónde usar Jev

> /typesafe:typesafe-ai Explora este repo y dime dónde un juicio de TypeSafe podría reemplazar parsing frágil o una decisión que hoy le pedimos a un LLM. Para cada lugar: archivo, la pregunta que harías (tipo, instrucción y criterios) y por qué no es mejor dejarlo en código. Máximo 3. No cambies nada.

### 2. Proponer la siguiente regla (la de la demo)

> /typesafe:typesafe-ai Lee jev.rules.ts y packages/jev-flow/src/review. Propón UNA pregunta nueva para la revisión de PRs que cubra una regla de CLAUDE.md que hoy no revisamos. Dame: nombre, tipo, instrucción en inglés, criterios, umbral y cómo la probaría con un fixture nuevo en fixtures/reviews. No cambies código.

### 3. Experimentar barato (necesita `TYPESAFE_API_KEY`)

> /typesafe:typesafe-ai Con la key de .env, corre consultas pequeñas para comparar dos redacciones de la pregunta `urgency` de jev.rules.ts sobre las subtareas de tickets/PDP-142.json. Usa JEV_MODE=live, no grabes nada y dime cuál separa mejor .3 de .4.

### 4. Buscar un cookbook que aplique

> /typesafe:typesafe-ai Revisa el índice de cookbooks (docs.typesafe.ai/cookbooks) y dime si alguno aplica a nuestra revisión de PRs, en especial «Self-consistency: nouls» para mandar a revisión humana las probabilidades dudosas.

## Lo que la skill nos recuerda (y el repo ya hace)

- Reglas, cuentas y efectos en código; Jev solo para el juicio.
- Preguntas y umbrales en un archivo (`jev.rules.ts`).
- La confianza no es permiso para actuar: los umbrales salen del costo del error y de nuestros datos.
- Un Noul cerca de 0.5 es «no sé», no «medio».
- Cambiar un peso o un umbral no requiere volver a llamar a Jev; cambiar una pregunta sí (regraba los replays).
- La API key, solo del lado del servidor.
