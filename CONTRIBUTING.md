# Contribuir a Crow Repuestos

## Commits (Conventional Commits)

Desde julio 2026 los commits se validan automáticamente con [commitlint](https://commitlint.js.org/) vía un git hook (husky). El formato exigido es [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

```
<tipo>(<scope opcional>): <descripción>

[cuerpo opcional]

[footer opcional]
```

Tipos permitidos (los de `@commitlint/config-conventional`): `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

La descripción puede estar en español (no se valida el idioma ni mayúsculas/minúsculas del subject). Ejemplos:

```
feat(checkout): agrega selección de método de envío
fix(auth): corrige expiración del refresh token
docs: actualiza DEPLOY.md con la config de pgbouncer
chore(deps): actualiza react-router-dom a 6.26.2
```

### Activar el hook

El hook vive en `.husky/commit-msg` y se activa solo al instalar dependencias en la raíz del repo (una vez por clon):

```bash
npm install
```

Esto corre `husky` (script `prepare`), que apunta `core.hooksPath` a `.husky/`. A partir de ahí, cualquier `git commit` con un mensaje que no cumpla el formato se rechaza con el detalle de qué falta.

Para probar un mensaje sin commitear:

```bash
echo "fix: corrige bug" | npx commitlint
```

## Tags de versión

Se sigue [SemVer](https://semver.org/lang/es/) (`MAJOR.MINOR.PATCH`). Al cortar una versión de producción:

```bash
git tag -a v1.2.0 -m "v1.2.0"
git push origin v1.2.0
```

- `MAJOR`: cambios incompatibles (breaking changes en la API o el schema de DB sin migración compatible hacia atrás).
- `MINOR`: features nuevas compatibles hacia atrás (`feat:`).
- `PATCH`: fixes y cambios menores (`fix:`, `chore:`, `docs:`).

Pushear un tag `vX.Y.Z` dispara `.github/workflows/release.yml`, que buildea las imágenes Docker de `api` y `web` y las publica en GitHub Container Registry taggeadas con esa versión (y con `latest`). `DEPLOY.md` (sección "Versionado y rollback") explica cómo desplegar una versión específica y cómo volver a una anterior.

No hay generación automática de changelog todavía — si se necesita en el futuro, `conventional-changelog`/`standard-version` pueden leer directamente el historial ya que ahora sigue Conventional Commits.

## Branch protection en `master`

Esto **no se puede configurar desde acá** (requiere permisos de admin en GitHub, vía la web o la API con un token que este entorno no tiene). Pasos manuales para quien administre el repo:

1. GitHub → repo → **Settings → Branches → Add branch protection rule**.
2. Branch name pattern: `master`.
3. Activar como mínimo:
   - **Require a pull request before merging** (y opcionalmente "Require approvals": 1+).
   - **Require status checks to pass before merging** → seleccionar los workflows existentes (`backend.yml`, `frontend.yml` en `.github/workflows/`).
   - **Require branches to be up to date before merging**.
   - **Do not allow bypassing the above settings** (incluye admins, si se quiere que la regla aplique a todos sin excepción).
4. Guardar.

Sin esto, cualquiera con push access puede subir directo a `master` sin pasar CI ni review, que es el hallazgo original de la auditoría.
