# Apply: root-backend-readme

## Resumen

Se creó `README.md` en la raíz del repo (no existía) y se reescribió `backend/README.md` para reflejar el estado real del código: 11 modelos, 14 módulos de rutas, healthcheck correcto, y sin referencias a dependencias/funciones ya reemplazadas o inexistentes. Hallazgo "Alta" #13 de la auditoría técnica del 2026-07-13.

## Archivos modificados

- `README.md` (nuevo, raíz del repo)
- `backend/README.md` (reescrito completo)

## Decisiones documentadas

- El README raíz es un punto de entrada de alto nivel (overview + cómo levantar todo con Docker Compose), no un duplicado de `backend/README.md`/`DEPLOY.md` — enlaza a ambos para el detalle.
- Se corrigió una referencia a una función inexistente (`require_user`) por las tres funciones reales de `app/core/deps.py` (`get_current_user`, `require_admin`, `get_optional_admin`), verificado por grep antes de escribir.
- Se corrigió el healthcheck documentado de `/health` a `/api/health` (verificado contra `app/main.py`).
- Todo el contenido de ambos README (modelos, rutas, estructura de directorios) se armó a partir de listados reales del filesystem (`ls`), no de memoria ni de la versión anterior del documento.

## Verificación

- `ls *.md` en la raíz antes del cambio confirmó ausencia de `README.md`.
- `ls backend/app/models/*.py` → 10 archivos / 11 clases de modelo (Order + OrderItem comparten archivo).
- `ls backend/app/api/routes/*.py` → 14 módulos.
- `grep -n "health"` en `app/main.py` → confirmó `/api/health`.
- `grep -n "^def "` en `app/core/deps.py` → confirmó los nombres reales de las dependencias de auth.
- Lectura completa de ambos archivos tras escritura (Read para el raíz, `wc -l`/`tail` para `backend/README.md` tras el swap Write-sibling+`mv -f`) — sin truncamiento por el desync del mount de OneDrive.

## Pendiente / limitaciones

- Documentación pura, no aplica suite de tests. Si se agregan/quitan modelos o módulos de rutas en el futuro, ambos README quedarán desactualizados hasta que alguien los revise manualmente — no hay generación automática de esta documentación a partir del código.
