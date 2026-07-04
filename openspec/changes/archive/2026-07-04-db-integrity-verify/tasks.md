# Tasks: db-integrity-verify

- [x] T1 — Escribir `backend/scripts/verify_db_integrity.py` con los 12 chequeos (extensión, 3 índices GIN, 2 CHECK constraints, 4 índices parciales, 2 índices simples).
- [x] T2 — Usuario corre el script dentro del contenedor `api` y comparte la salida.
- [x] T3 — Revisar la salida: 11 de 12 objetos faltaban de verdad (solo `pg_trgm` ya estaba). Se aplicaron sin errores -- confirma que no había datos que violaran los CHECK constraints nuevos.
- [x] T4 — Archivar el change.
