# Tasks: docker-image-versioning-rollback

- [x] **T1** — Confirmar que no había versionado de imágenes (`docker-compose.prod.yml` usaba `build:`) y que no había tags git aún (`git tag`)
- [x] **T2** — `git remote -v` para derivar el namespace de GHCR (`lautigit1/Crow-v3`)
- [x] **T3** — Revisar `CONTRIBUTING.md` (sección "Tags de versión" ya existente) y `DEPLOY.md` para entender el esquema SemVer ya documentado
- [x] **T4** — Crear `.github/workflows/release.yml`: disparado por tags `v*.*.*`, matrix `[api, web]`, build+push a GHCR con `docker/build-push-action@v6`, tags `<version>` y `latest`
- [x] **T5** — `docker-compose.prod.yml`: `api` de `build: ./backend` a `image: ghcr.io/lautigit1/crow-v3-api:${IMAGE_TAG:-latest}`
- [x] **T6** — `docker-compose.prod.yml`: `web` de `build: {context, args}` a `image: ghcr.io/lautigit1/crow-v3-web:${IMAGE_TAG:-latest}` (comentario explicando que `VITE_SENTRY_DSN` ahora se compila en CI, no en el compose)
- [x] **T7** — Documentar `IMAGE_TAG` en `.env.example`
- [x] **T8** — `DEPLOY.md`: actualizar "Primer deploy"/"Actualizaciones" (`pull` en vez de `--build`) y agregar sección "Versionado y rollback" completa, incluyendo el caso de migraciones de DB de por medio
- [x] **T9** — `CONTRIBUTING.md`: referenciar el nuevo workflow desde la sección "Tags de versión" existente
- [x] **T10** — Verificar YAML válido de `docker-compose.prod.yml` y `release.yml` (`python3 -c "import yaml; yaml.safe_load(...)"`)
