# Apply: suppliers-model-validate

## Archivos modificados

- `backend/app/api/routes/suppliers.py` — 2 ocurrencias reemplazadas:
  - `_to_read()` helper
  - `list_suppliers()` inline

## Cambio aplicado

```python
# ❌ Antes
SupplierRead(
    **{c.name: getattr(s, c.name) for c in s.__table__.columns},
    product_count=count,
)

# ✅ Después
SupplierRead.model_validate(s, from_attributes=True).model_copy(
    update={"product_count": count}
)
```

## Nota

La proposal mencionaba `model_validate(s, update={"product_count": count})` pero
ese parámetro no existe en Pydantic v2. El patrón correcto requiere el encadenamiento
`model_validate(...).model_copy(update={...})`.

## Desviaciones del plan

La implementación usa `.model_copy(update=...)` en lugar del `update=` kwarg
en `model_validate` (que no existe en Pydantic v2). La proposal fue corregida
en consecuencia.
