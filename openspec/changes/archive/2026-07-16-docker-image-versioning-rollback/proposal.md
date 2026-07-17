# Proposal: docker-image-versioning-rollback

## What

Hallazgo "Alta" #16 de la auditoría técnica del 2026-07-13: no existía versionado real de las imágenes Docker de producción ni un plan de rollback documentado. `docker-compose.prod.yml` usaba `build: ./backend` / `build: ./frontend` -- cada deploy reconstruía las imágenes en el propio servidor, sobreescribiendo la anterior. Sin una imagen vieja conservada en ningún lado, "volver a la versión anterior" no era una operación real: la única opción era `git checkout` a un commit viejo y rebuildear desde ahí, con el downtime y el riesgo de eso.

## Why

Cuando un deploy rompe algo en producción, el tiempo que toma revertir importa. Rebuildear desde cero (`npm install`, `pip install`, build de Vite, etc.) en el servidor de producción, bajo presión, con el sitio caído, es lento y propenso a fallar de formas distintas a las que fallaron en CI (versión de Docker distinta, cache sucio, etc.). Un esquema de imágenes versionadas y publicadas de antemano convierte el rollback en "cambiar un tag y hacer pull" -- segundos, no minutos, y usando exactamente los mismos bytes que ya se probaron en CI.

## Non-goals

- No se armó un pipeline de blue-green deployment ni de despliegue sin downtime -- eso es un cambio de arquitectura mayor. El alcance acá es: imágenes versionadas + rollback documentado y operable con los mismos `docker compose` que ya se usan.
- No se automatizó el rollback en sí (un botón/comando que lo haga solo) -- se documentó el procedimiento manual, incluyendo el caso más peligroso (migraciones de DB de por medio), que requiere criterio humano y no debería ser un one-liner ciego.
- No se pudo probar el flujo end-to-end (push de un tag real, ver que GitHub Actions publique en GHCR, hacer un `pull`+`up -d` contra un servidor real) en este entorno -- sin Docker ni credenciales de GitHub Actions disponibles en el sandbox de verificación.

## Success criteria

- Nuevo workflow `.github/workflows/release.yml`: al pushear un tag `vX.Y.Z`, buildea las imágenes de `api` y `web` y las publica en GHCR taggeadas con esa versión y con `latest`.
- `docker-compose.prod.yml`: `api`/`web` pasan de `build:` a `image: ghcr.io/.../...:${IMAGE_TAG:-latest}`.
- `.env.example` documenta `IMAGE_TAG`.
- `DEPLOY.md` tiene una sección "Versionado y rollback" con el procedimiento completo, incluyendo el caso de migraciones de base de datos de por medio (que un rollback de código no revierte por sí solo).
- `CONTRIBUTING.md` (sección "Tags de versión", ya existente de un cambio anterior de esta sesión) referencia el nuevo workflow.
