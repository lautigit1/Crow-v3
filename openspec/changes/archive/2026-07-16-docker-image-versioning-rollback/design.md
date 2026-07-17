# Design: docker-image-versioning-rollback

## Por qué GHCR y no Docker Hub

El repo ya vive en GitHub (`github.com/lautigit1/Crow-v3`, confirmado vía `git remote -v`). GitHub Container Registry (`ghcr.io`) se autentica con el mismo `GITHUB_TOKEN` que ya provee cada corrida de Actions automáticamente (con permiso `packages: write` declarado en el job) -- no requiere dar de alta una cuenta ni un secret nuevo en el repo, a diferencia de Docker Hub. Se usó `docker/login-action` + `docker/build-push-action`, las acciones oficiales de Docker para esto.

## Por qué un workflow separado, disparado por tag

Los otros tres workflows (`frontend.yml`, `backend.yml`, `e2e.yml`) corren en cada push/PR a `master` -- son gates de calidad continuos. Publicar una imagen versionada es un evento distinto: pasa solo cuando alguien decide cortar una versión de producción (`git tag vX.Y.Z && git push origin vX.Y.Z`), no en cada commit. Encadenarlo a `push: tags: ["v*.*.*"]` en vez de a `master` evita construir y publicar una imagen nueva en cada merge que nunca se va a desplegar.

## Reemplazar `build:` por `image:` en el compose de producción

Este es el cambio que realmente habilita el rollback. Con `build:`, cada `docker compose up -d --build` reconstruye la imagen localmente en el servidor -- la imagen anterior no queda referenciada por ningún tag después de eso (sigue en el cache de Docker hasta que algo la garbage-collectee, pero no hay forma declarativa de "volver a esa"). Con `image: .../crow-v3-api:${IMAGE_TAG:-latest}`, cada versión publicada por CI queda taggeada y disponible en el registry indefinidamente -- "rollback" pasa a ser literalmente cambiar el valor de una variable y hacer `pull`.

`IMAGE_TAG` tiene default `latest` para que el primer deploy (`DEPLOY.md`, sección "Primer deploy") no dependa de que el operador sepa de antemano qué número de versión usar -- simplemente sigue la última publicada. Fijar un número exacto (`IMAGE_TAG=1.4.0`) es una decisión explícita para cuando se necesita precisión (rollback, o desplegar una versión específica más vieja intencionalmente).

## `VITE_SENTRY_DSN` se mueve de env var de compose a build-arg de CI

Antes, `docker-compose.prod.yml` pasaba `VITE_SENTRY_DSN` como build-arg en el momento del `docker compose up -d --build` en el servidor. Como ahora `web` es una imagen ya construida (sin `build:` en el compose de producción), ese valor tiene que quedar compilado en el bundle de Vite en el momento del build real, que ahora ocurre en `release.yml` -- se agregó como `secrets.VITE_SENTRY_DSN` (opcional; si no está seteado en el repo, llega vacío al build-arg y Sentry queda deshabilitado, mismo comportamiento default que antes).

## El caso peligroso: rollback con una migración de por medio

Un rollback de *código* (volver la imagen `api` a una versión vieja) no revierte el *schema* de la base -- el `alembic upgrade head` que corrió la versión rota ya se aplicó y persiste. Si la versión rota agregó una columna `NOT NULL` nueva, por ejemplo, y se vuelve a una imagen vieja cuyo ORM no la conoce, el código viejo puede fallar de formas nuevas contra un schema que nunca vio. Por eso `DEPLOY.md` documenta explícitamente tres casos (sin migración nueva / con migración reversible / con migración no reversible o dudosa) en vez de dar un único comando de rollback que ignore esta distinción -- forzar un `alembic downgrade` sin verificar que el `downgrade()` de esa revisión es seguro puede perder datos. Para el caso dudoso, se prioriza restaurar desde el backup de Postgres ya existente (`deploy/backup-postgres.sh`/`restore-postgres.sh`, de un cambio anterior de esta sesión) por sobre forzar una reversión de schema.

## Verificación en este entorno

No se pudo probar el flujo real (push de un tag, ver la corrida de `release.yml`, confirmar que las imágenes aparecen en GHCR, hacer `pull`+`up -d` contra un servidor) -- no hay Docker daemon ni credenciales de GitHub Actions en el sandbox de verificación de esta sesión (limitación conocida, ya documentada en cambios anteriores). Se verificó lo que sí es posible sin eso:

- `python3 -c "import yaml; yaml.safe_load(...)"` sobre `docker-compose.prod.yml` y `.github/workflows/release.yml` -- ambos YAML válidos.
- Revisión manual de la sintaxis de `docker/login-action@v3`, `docker/setup-buildx-action@v3` y `docker/build-push-action@v6` contra su uso documentado (acciones oficiales de Docker, ampliamente usadas).
- Confirmación de que `git remote -v` apunta a `github.com/lautigit1/Crow-v3`, usado para derivar el namespace de GHCR (`ghcr.io/lautigit1/crow-v3-{api,web}`).

La primera corrida real de `release.yml` (al pushear el primer tag `vX.Y.Z` después de este cambio) es la que confirma en la práctica que el build+push funciona.
