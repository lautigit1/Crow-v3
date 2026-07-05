# Proposal: fix-ci-npm-ci

## What

El job `Frontend CI` (`.github/workflows/frontend.yml`) falla en el paso
`npm ci` con:

```
npm error `npm ci` can only install packages when your package.json and
package-lock.json or npm-shrinkwrap.json are in sync.
npm error Missing: @emnapi/core@1.11.2 from lock file
npm error Missing: @emnapi/runtime@1.11.2 from lock file
npm error Missing: esbuild@0.28.1 from lock file
```

Arreglar la causa raíz para que `npm ci` vuelva a pasar.

## Why

`frontend/package.json` tiene `"vitest": "^4.1.9"` (agregado junto con
`"vite": "^5.4.6"` en el change `frontend-tests`), pero `vitest@4.1.9`
requiere `vite: "^6.0.0 || ^7.0.0 || ^8.0.0"` como peer dependency —
confirmado directamente por el resolver de npm (`npm warn ... peerOptional
esbuild ... from vite@8.1.0 ... vite@"^6.0.0 || ^7.0.0 || ^8.0.0" from
vitest@4.1.9`). Como el `vite` de nivel superior está pineado en `^5.4.6`
(no satisface ese rango), npm intenta anidar una copia separada de
`vite@8.1.0` solo para `vitest`, arrastrando toda su cadena de
dependencias nativas por plataforma (`esbuild@0.28.1`,
`@rolldown/binding-wasm32-wasi`, `@napi-rs/wasm-runtime`,
`@emnapi/core@1.11.2`, `@emnapi/runtime@1.11.2`, binarios de `rollup`,
`lightningcss`, etc.). El `package-lock.json` committeado no refleja esa
resolución completa de forma consistente (probablemente quedó a mitad de un
`npm install` interrumpido o resuelto con conflictos de peer deps), por lo
que `npm ci` — que valida que el lock sea internamente consistente antes de
instalar, sin volver a resolver nada — rechaza el archivo.

## Non-goals

- No se actualiza `@vitejs/plugin-react` (su peer range `^4.2.0 || ^5.0.0 ||
  ^6.0.0 || ^7.0.0` ya cubre `vite@7`, no hace falta tocarlo).
- No se sube `vite` a la v8: `@vitejs/plugin-react@4.7.0` (versión
  actualmente instalada) todavía no declara soporte para `vite@8` en su
  peerDependencies, así que ir a v8 hubiera cambiado un problema de peer deps
  por otro.
- No se regenera `package-lock.json` en este change (ver nota en
  `apply.md` — este sandbox no tiene acceso a la registry de npm).

## Success criteria

- `frontend/package.json`: `vite` en un rango que satisface simultáneamente
  el peer de `vitest@^4.1.9` (`^6||^7||^8`) y el de
  `@vitejs/plugin-react@4.7.0` (`^4.2||^5||^6||^7`) — intersección: `^7.x`.
- Ya no hace falta una copia anidada de `vite` para `vitest`: una sola
  versión de `vite` en el árbol de dependencias.
- Documentado explícitamente que falta un `npm install` real (con red) +
  commit del `package-lock.json` regenerado para que `npm ci` pase en CI.
