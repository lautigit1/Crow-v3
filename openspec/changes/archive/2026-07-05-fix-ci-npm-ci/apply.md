# Apply: fix-ci-npm-ci

## Archivos modificados

- `frontend/package.json` — `"vite": "^5.4.6"` → `"^7.0.0"`. Único cambio de
  contenido real (el resto del diff de `git diff` en este repo es ruido de
  fin de línea CRLF/LF preexistente en el working tree, no relacionado con
  este change — confirmado comparando línea por línea).

## Lo que NO se modificó (y por qué)

- `frontend/package-lock.json` — **no se tocó**. Este sandbox no tiene
  acceso a la registry de npm (`npm ping` → `403 Forbidden`; `npm install`
  y `npm install --package-lock-only` sin `--offline` fallan igual al
  intentar `GET https://registry.npmjs.org/vite`). Se probó
  `npm install --package-lock-only --offline` como alternativa: en vez de
  completar la subrama faltante de `vite@7`, terminó **eliminando**
  entradas del lock que sí hacían falta (pasó de 363 a 330 paquetes,
  sin agregar los que realmente se necesitan) — es decir, hubiera dejado
  el lock "consistente" pero incorrecto, sin representar lo que `npm
  install` real produciría. Se descartó ese resultado explícitamente (no
  quedó commiteado).

## Verificación

- Se reprodujo el fallo de CI localmente con `npm ci --dry-run --offline` y
  se confirmó la causa raíz con los propios warnings del resolver de npm
  (no es una suposición: el resolver imprime explícitamente que
  `vitest@4.1.9` requiere `vite@"^6.0.0 || ^7.0.0 || ^8.0.0"`).
- Se confirmó el peer range real de `@vitejs/plugin-react@4.7.0` (ya
  instalado) leyendo `node_modules/.package-lock.json`:
  `"vite": "^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0"` — no incluye `^8`, lo que
  descarta subir directamente a la v8 que el resolver había anidado.
- Se verificó con `git diff -U0` que el único cambio de contenido real en
  `package.json` es el bump de `vite`, filtrando el ruido de line-endings.

## Desviaciones del plan / trabajo pendiente

- **T5 y T6 de `tasks.md` quedan sin marcar** — requieren correr `npm
  install` con acceso real a la registry y validar `test:run`/`build:ci`,
  algo que este sandbox no puede hacer. Este change se archiva igual (mismo
  criterio que `auth-hardening`, donde tampoco se pudo correr `pytest` real)
  porque el trabajo que sí se podía hacer sin red — diagnóstico y el fix de
  `package.json` — está completo y verificado; lo que falta es
  explícitamente una acción que solo se puede hacer con red real, no una
  verificación que se haya saltado por descuido.
- **Acción requerida del usuario antes de que CI pase:**
  ```bash
  cd frontend
  npm install
  git add package.json package-lock.json
  git commit -m "fix: bump vite to ^7.0.0 to satisfy vitest 4 peer range"
  git push
  ```
