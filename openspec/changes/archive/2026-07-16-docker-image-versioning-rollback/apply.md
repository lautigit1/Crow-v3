# Apply: docker-image-versioning-rollback

## Resumen

Las imágenes Docker de producción (`api`, `web`) pasan de construirse en el servidor en cada deploy a publicarse versionadas en GitHub Container Registry al pushear un tag `vX.Y.Z`, y `docker-compose.prod.yml` las consume por tag (`IMAGE_TAG`) en vez de rebuildearlas. `DEPLOY.md` documenta el procedimiento de rollback completo, incluyendo el caso de migraciones de base de datos de por medio. Hallazgo "Alta" #16 de la auditoría técnica del 2026-07-13.

## Archivos modificados

- `.github/workflows/release.yml` (nuevo)
- `docker-compose.prod.yml`
- `.env.example`
- `DEPLOY.md`
- `CONTRIBUTING.md`

## Decisiones documentadas

- GHCR en vez de Docker Hub -- se autentica con el `GITHUB_TOKEN` que cada corrida de Actions ya provee, sin secrets nuevos.
- Workflow separado disparado por tags (`v*.*.*`), no por push a `master` -- publicar una imagen es un evento de "corte de versión", distinto de los gates de calidad continuos de `frontend.yml`/`backend.yml`.
- `docker-compose.prod.yml` pasa de `build:` a `image: .../${IMAGE_TAG:-latest}` -- es el cambio que hace el rollback real (la imagen vieja queda intacta en el registry, no se pierde al reconstruir).
- `VITE_SENTRY_DSN` se mueve de build-arg del compose (build en el servidor) a build-arg del workflow de CI (build real ahora ocurre ahí).
- El rollback documentado distingue explícitamente 3 casos según si hubo una migración de Alembic de por medio, para no forzar un `alembic downgrade` a ciegas cuando lo más seguro es restaurar desde backup.

## Verificación

- `python3 -c "import yaml; yaml.safe_load(...)"` sobre `docker-compose.prod.yml` y `.github/workflows/release.yml` -- ambos válidos.
- `git remote -v` confirmó el namespace real (`lautigit1/Crow-v3`) usado para las rutas de imagen en GHCR.
- `git tag` confirmó que no había tags previos que pudieran entrar en conflicto con el esquema nuevo.
- Revisión manual de la sintaxis de las acciones oficiales de Docker (`login-action`, `setup-buildx-action`, `build-push-action`) usadas en el workflow.

## Pendiente / limitaciones

- **No se pudo probar el flujo end-to-end en este entorno**: sin Docker daemon ni credenciales de GitHub Actions en el sandbox de verificación de esta sesión (limitación conocida, documentada en cambios anteriores). La primera confirmación real de que `release.yml` publica correctamente en GHCR ocurre al pushear el primer tag `vX.Y.Z` después de este cambio.
- El procedimiento de rollback con migración de por medio requiere criterio humano (revisar si la migración es reversible) -- deliberadamente no se automatizó como un comando único, ver `design.md`.
