# Design: backend-test-coverage

## Fix previo: `seo.py`

Antes:
```python
db = next(get_db())
try:
    ...
finally:
    db.close()
```
Ahora: `db: DbSession` como parámetro inyectado por FastAPI, igual que
el resto de las rutas. `DbSession` ya es `Annotated[Session, Depends(get_db)]`
(`core/deps.py`), así que el cambio es mínimo y hace que
`app.dependency_overrides[get_db]` (usado por los tests) sí tenga efecto.

## test_audit.py

`AuditLog` no tiene endpoint de creación pública -- se insertan filas
directo con el fixture `db` para armar los escenarios (igual que
`test_suppliers.py` hace con `Product`). Cubre: 401/403, filtro por
prefijo de `action` (`action=login` matchea `login.success` y
`login.failure` pero no `product.create`), filtro por `actor_id`,
paginación, orden descendente por `created_at`.

## test_favorites.py

Usa los fixtures `user`, `admin` (como "otro usuario" para probar
aislamiento) y `product`. Cubre: requiere auth, agregar/quitar,
idempotencia (agregar dos veces no rompe ni duplica), producto
inexistente o soft-deleted (404), que los favoritos de un usuario no
aparezcan en la lista de otro.

## test_settings.py

`GET /settings` es público y usa `DEFAULT_SETTINGS` como fallback si no
hay filas en la tabla. Cubre: defaults sin filas, update requiere admin,
update parcial (`exclude_unset`) no pisa las demás claves, una
actualización posterior se refleja en el próximo `GET`.

## test_orders.py

El más grande de los cinco. Cubre creación (items, `payment_method`
opcional, validaciones de cantidad/lista vacía/producto inexistente),
snapshot de sku/nombre/precio en `OrderItem`, listado propio, detalle
ajeno (403), cancelación (solo si `Pendiente`, 409 si no; 403 si es de
otro usuario), listado admin con filtro por `user_id`, y actualización
de estado/notas por admin.

## test_seo.py

Sitemap y robots.txt son contenido estático + una query de categorías
activas. Cubre: status 200 y `content-type` correctos, que categorías
soft-deleted no aparezcan en el sitemap, que las rutas estáticas
(`/`, `/catalogo`, etc.) estén siempre presentes.
