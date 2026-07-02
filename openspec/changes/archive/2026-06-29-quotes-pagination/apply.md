# Apply: quotes-pagination

## Archivos modificados — Backend

- `app/api/routes/quotes.py` — `GET /quotes/me` ahora acepta `skip` y `limit`
  (default 20, máx 100) y retorna `{ items: list[QuoteRead], total: int }`
- `app/schemas/quote.py` — `QuoteList` schema agregado

## Archivos modificados — Frontend

- `frontend/src/entities/quote/index.ts` — `quoteApi.mine()` actualizado para
  aceptar `{ skip?, limit? }` y retornar `{ items, total }`
- `frontend/src/pages/account/MyQuotesPage.tsx` — lista con "Cargar más"
  (load-more infinito, PAGE_SIZE=20)

## Desviaciones del plan

- Se eligió "Cargar más" (append) en lugar de paginación numerada — más natural
  para un historial de cotizaciones en contexto de cuenta personal.
