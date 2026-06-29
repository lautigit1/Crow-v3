# Proposal: critical-fixes

## What

Corregir los 6 problemas críticos y de alta prioridad identificados en la auditoría técnica de Crow v3 que impiden un deploy seguro a producción.

## Why

El proyecto tiene una base técnica sólida pero estos problemas crean riesgos reales antes de cualquier deploy:

- **Credenciales hardcodeadas** en docker-compose.yml permiten que cualquier persona con acceso al repo pueda falsificar tokens JWT de admin.
- **TTL de 24h** en el access token (en lugar de 30 min) amplía enormemente la ventana de exposición si un token es comprometido.
- **Dashboard con datos incorrectos**: los contadores incluyen productos eliminados (soft delete), generando métricas de negocio incorrectas.
- **Bug en register limiter**: penaliza registros exitosos y usa una clave incorrecta, pudiendo bloquear IPs legítimas.
- **Build de CI sin TypeScript**: la imagen Docker puede contener errores de tipos no detectados.
- **node_modules en git**: infla el repositorio, impide auditorías de seguridad y rompe el flujo de dependencias.

## Non-goals

- No se cambia el motor de base de datos (PostgreSQL se mantiene).
- No se cambia la arquitectura existente.
- No se toca el sistema de autenticación más allá del fix del rate limiter.

## Success criteria

- `docker compose up` sin variables de entorno explícitas falla con mensaje claro en lugar de arrancar inseguro.
- El access token dura 30 min en todos los entornos.
- El dashboard muestra únicamente productos activos (no eliminados).
- Los productos eliminados muestran fecha y hora exacta de eliminación en zona horaria Argentina (ART, UTC-3) en el panel admin.
- El admin puede restaurar un producto eliminado desde el panel admin.
- Un registro exitoso no incrementa el contador de fallos del rate limiter.
- `npm run build:ci` valida TypeScript antes de construir.
- `node_modules/` está en `.gitignore` y no aparece en `git status`.
