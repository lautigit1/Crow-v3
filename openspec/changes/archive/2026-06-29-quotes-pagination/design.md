# Design: quotes-pagination

## Backend

### `backend/app/api/routes/quotes.py`

```python
@router.get("/me", response_model=QuoteList)
def my_quotes(
    current_user: CurrentUser,
    db: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> QuoteList:
    base = select(Quote).where(Quote.user_id == current_user.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = list(db.scalars(base.order_by(Quote.created_at.desc()).offset(skip).limit(limit)).all())
    return QuoteList(items=items, total=total)
```

`QuoteList` ya existe en `schemas/quote.py` — no requiere cambios en schemas.

## Frontend

### `frontend/src/entities/quote/index.ts`

```ts
type QuoteList = { items: Quote[]; total: number };

mine: (params?: { skip?: number; limit?: number }) =>
  api.get<QuoteList>("/quotes/me", { params }).then((r) => r.data),
```

### `frontend/src/pages/account/MyQuotesPage.tsx`

- Estado: `quotes: Quote[]`, `total: number`, `loading: boolean`, `skip: number`
- Carga inicial: `skip=0, limit=20`
- Botón "Cargar más": visible si `quotes.length < total`, hace `skip += 20`
  y append al array existente.
- No resetea al montar — un refresh del componente reinicia el estado
  automáticamente.
