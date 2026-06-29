# Proposal: quotes-pagination

## What

Agregar paginación a `GET /quotes/me` (backend) y al componente `MyQuotesPage`
(frontend) para que los usuarios con muchas cotizaciones no las carguen todas
de una vez.

## Why

`GET /quotes/me` retorna `list[QuoteRead]` sin límite. Un usuario activo con
100+ cotizaciones hace una sola query que trae toda la tabla filtrada y la
serializa completa. No hay skip/limit.

El endpoint admin `GET /quotes` ya tiene paginación correcta (`QuoteList` con
`items` + `total`). `GET /quotes/me` debería seguir el mismo patrón.

## Success criteria

- Backend: `GET /quotes/me` acepta `skip` y `limit` (default 20, máx 100) y
  retorna `{ items: Quote[], total: int }`.
- Frontend: `MyQuotesPage` muestra las primeras 20 y tiene un botón
  "Cargar más" (infinite scroll simple, no numeración de páginas).
- El tipo `quoteApi.mine()` se actualiza para aceptar params y retornar
  `{ items, total }`.
- Sin breaking change en el endpoint admin (`GET /quotes` no se toca).
