# Tasks: root-backend-readme

- [x] **T1** — Confirmar que no existía `README.md` en la raíz (`ls *.md`)
- [x] **T2** — Leer `DEPLOY.md` para consistencia de la sección de deploy del README raíz
- [x] **T3** — Listar `frontend/src/` para describir correctamente las capas FSD en el README raíz
- [x] **T4** — Escribir `README.md` en la raíz: overview, stack, cómo levantar todo, estructura, calidad de código, contribuir, deploy, links
- [x] **T5** — Verificar `README.md` raíz vía Read (57 líneas, contenido completo, sin truncamiento)
- [x] **T6** — Reescribir `backend/README.md`: stack real (Redis, ruff), estructura de directorios, sección de 11 modelos, sección de 14 módulos de rutas, healthcheck corregido a `/api/health`, tabla de endpoints ampliada, referencia a `require_user` corregida a `get_current_user`/`require_admin`/`get_optional_admin`
- [x] **T7** — Verificar `backend/README.md` vía `wc -l` + `tail -5` tras el swap Write-sibling+`mv -f` (114 líneas)
