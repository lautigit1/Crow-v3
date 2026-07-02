# Design: suppliers-model-validate

## Problema técnico

En `suppliers.py` existían dos lugares con dict comprehension frágil:

```python
# ❌ Antes — itera columnas de DB, bypasea validators de Pydantic
def _to_read(s: Supplier, count: int) -> SupplierRead:
    return SupplierRead(
        **{c.name: getattr(s, c.name) for c in s.__table__.columns},
        product_count=count,
    )
```

## Fix

```python
# ✅ Después — Pydantic v2 correcto
def _to_read(s: Supplier, count: int) -> SupplierRead:
    return SupplierRead.model_validate(s, from_attributes=True).model_copy(
        update={"product_count": count}
    )
```

## Por qué `model_validate(..., update=...)` no funciona en Pydantic v2

`model_validate()` en Pydantic v2 no acepta el parámetro `update=`. La firma correcta es:

```python
model_validate(obj, *, strict=None, from_attributes=None, context=None)
```

El patrón correcto para inyectar campos adicionales post-validación es:
1. `model_validate(obj, from_attributes=True)` → crea la instancia desde el ORM
2. `.model_copy(update={...})` → retorna una copia con los campos adicionales

## Archivos afectados

- `backend/app/api/routes/suppliers.py` — 2 ocurrencias reemplazadas
