# Proposal: backend-test-coverage

## What

Completar la cobertura de tests de backend que faltaba: `audit`,
`favorites`, `settings`, `orders` y `seo` -- los únicos módulos de rutas
sin ningún test hasta ahora (`brands`, `categories`, `dashboard`,
`quotes`, `suppliers`, `users`, `products`, `uploads`, `auth` ya estaban
cubiertos de trabajo previo).

## Why

Pedido del usuario: cobertura completa de tests + E2E. Se acordó
arrancar por backend (ver conversación) porque es lo más acotado y
verificable -- estos módulos son los que quedaban sin ningún archivo de
test.

## Alcance

- Un archivo de test por módulo, mismo estilo que los existentes
  (`tests/test_suppliers.py` como referencia: clases `TestX` agrupando
  por endpoint, fixtures de `conftest.py`).
- Bug encontrado y corregido de paso: `seo.py` llamaba `next(get_db())`
  directamente en vez de usar `Depends(get_db)`. Esto bypasea
  `dependency_overrides` (el mecanismo que usan los tests para inyectar
  la sesión de SQLite), así que el endpoint era imposible de testear sin
  arreglarlo primero -- en el proceso de test hubiera intentado conectar
  a la base real configurada en `DATABASE_URL`.

## Non-goals

- No se tocan los módulos ya cubiertos.
- No se agrega frontend testing ni E2E en este change (queda para los
  próximos, ya charlados con el usuario).
