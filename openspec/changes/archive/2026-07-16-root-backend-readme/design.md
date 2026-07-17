# Design: root-backend-readme

## Fuente de verdad usada para cada afirmación

Todo lo que quedó escrito en ambos README se verificó contra el repo real, no se redactó de memoria:

- **11 modelos**: `ls backend/app/models/*.py` (10 archivos; `Order` y `OrderItem` comparten `order.py`).
- **14 módulos de rutas**: `ls backend/app/api/routes/*.py`.
- **Healthcheck real**: `grep -n "health" backend/app/main.py` → `/api/health`, no `/health`.
- **Funciones reales de auth/deps**: `grep -n "^def " backend/app/core/deps.py` → `get_current_user`, `require_admin`, `get_optional_admin` (el README viejo citaba `require_user`, que no existe).
- **Stack de producción** (para la sección de deploy del README raíz): primeras líneas de `DEPLOY.md`, que ya describe `docker-compose.prod.yml` con pgbouncer + Caddy.
- **Estructura de `frontend/src/`**: `ls frontend/src/` → confirmé los nombres reales de las capas FSD (`app/entities/features/pages/shared/widgets`) en vez de asumir la convención estándar de Feature-Sliced Design.

## Por qué el README raíz no duplica el contenido de `backend/README.md`

El README raíz es un punto de entrada — describe el proyecto como un todo y cómo levantar el stack completo con Docker Compose (el flujo que un desarrollador nuevo va a querer primero). Los detalles de cómo correr el backend sin Docker, qué variables de entorno necesita cada script, o el detalle módulo por módulo, quedan en `backend/README.md` (para el backend) y `DEPLOY.md` (para producción), enlazados desde la raíz en vez de repetidos.

## Corrección de bug de documentación: función inexistente

`backend/README.md` (versión anterior a este cambio) citaba `require_user` como la dependencia de FastAPI usada para proteger rutas. Esa función no existe en `app/core/deps.py` — las reales son `get_current_user` (requiere sesión válida), `require_admin` (requiere rol admin), `get_optional_admin` (admin opcional, usado en endpoints públicos con comportamiento distinto si hay sesión admin). Se corrigió citando los tres nombres reales.

## Verificación en este entorno

No aplica verificación de tests para este cambio (es documentación pura). Se verificó por lectura completa (`wc -l` + `cat`) de ambos archivos tras el swap Write-sibling+`mv -f`, confirmando que no quedó contenido truncado por el desync del mount de OneDrive que afectó a otros archivos en esta misma sesión.
