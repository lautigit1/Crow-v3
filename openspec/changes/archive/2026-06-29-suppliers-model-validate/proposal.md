# Proposal: suppliers-model-validate

## What

Reemplazar el dict comprehension frágil en `suppliers.py` por `SupplierRead.model_validate()`.

## Why

El código actual:

```python
SupplierRead(
    **{c.name: getattr(s, c.name) for c in s.__table__.columns},
    product_count=count,
)
```

Itera sobre `s.__table__.columns` (columnas de DB) en lugar de pasar el objeto ORM
directamente a Pydantic. Esto es frágil porque:

1. Si se agrega un campo al schema que no existe como columna (computed, alias), falla.
2. Si se renombra una columna en el modelo pero no en el schema, pasa datos incorrectos.
3. Bypasea los validators de Pydantic — ningún `field_validator` se ejecuta.
4. `SupplierRead` ya tiene `model_config = ConfigDict(from_attributes=True)` — fue
   diseñado para recibir el objeto ORM directamente.

## Fix

```python
SupplierRead.model_validate(s, update={"product_count": count})
```

`model_validate` con `from_attributes=True` lee los atributos del ORM directamente.
El parámetro `update` (Pydantic v2) inyecta campos adicionales después de la validación.
