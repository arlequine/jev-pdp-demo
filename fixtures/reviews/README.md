# Fixtures de revisión

Cinco cambios pequeños con el veredicto que debería salir. Los usa `npm run rules:compare` para comparar una pregunta amplia («¿este PR está bien?») contra las reglas de `jev.rules.ts`.

| Fixture | Qué hace | Esperado |
|---|---|---|
| 01-format-price | Formatea el precio con `Intl.NumberFormat` | APROBAR |
| 02-unsafe-html | Pinta la descripción con `dangerouslySetInnerHTML` sin limpiar | BLOQUEAR |
| 03-client-price | El carrito manda el precio desde el navegador | BLOQUEAR |
| 04-drop-alt | Quita el `alt` de la galería | BLOQUEAR |
| 05-loading-state | Agrega un estado de carga | APROBAR |
