# Proposal: ci-cd-github-actions

## What

Agregar pipelines de CI/CD con GitHub Actions que validen automáticamente cada push y PR a `master`.

## Why

Actualmente cualquier cambio en el código puede romper el backend o el frontend sin que nadie lo detecte antes de deployar. No hay gating de calidad: un test roto, un error de tipos o un import faltante puede llegar a producción directamente.

Con CI:
- Los errores se detectan en segundos, no en producción.
- Los PRs tienen un gate obligatorio antes de mergear.
- El historial de builds es evidencia de la salud del proyecto.

## Non-goals

- No se configura CD (deploy automático) — eso requiere definir el entorno de producción primero.
- No se agregan tests nuevos en este change (eso es un change separado).
- No se cambia la infraestructura de Docker.

## Success criteria

- Cada push a `master` o PR dispara automáticamente los workflows.
- El workflow de backend corre los tests existentes con pytest y falla si alguno falla.
- El workflow de frontend valida TypeScript (`tsc --noEmit`) y construye (`vite build`).
- Ambos workflows muestran status checks en los PRs de GitHub.
- Los workflows usan cache de dependencias para minimizar el tiempo de ejecución.
