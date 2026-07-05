# Design: fix-ci-npm-ci

## Diagnóstico (evidencia)

```
$ npm ci --dry-run --offline
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: vite@8.1.0
npm warn Found: esbuild@undefined
npm warn node_modules/vitest/node_modules/esbuild
npm warn
npm warn Could not resolve dependency:
npm warn peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.1.0
npm warn node_modules/vitest/node_modules/vite
npm warn   vite@"^6.0.0 || ^7.0.0 || ^8.0.0" from vitest@4.1.9
npm warn   node_modules/vitest
```

`vitest@4.1.9` (declarado en `package.json`) necesita `vite@^6||^7||^8`. El
`vite` de nivel superior (`^5.4.6`) no entra en ese rango, así que npm arma
un `vite@8.1.0` anidado exclusivo para `vitest`, con su propia cadena de
binarios nativos por plataforma (esbuild, rollup, lightningcss) y bindings
wasm (`@rolldown/binding-wasm32-wasi` → `@napi-rs/wasm-runtime` →
`@emnapi/core`/`@emnapi/runtime`). El `package-lock.json` commiteado no
tiene esa subrama completa (o la tiene a medias), y `npm ci` — a diferencia
de `npm install`, que sí volvería a resolver todo — solo valida consistencia
interna del lock contra `package.json`, así que falla duro apenas encuentra
una referencia sin resolver.

Confirmado además que ni siquiera el `node_modules` ya instalado localmente
(fuera de git, en la carpeta de trabajo del usuario) tiene esa subrama
completa — el problema no es solo del lock commiteado, el propio entorno
local quedó en el mismo estado a medio resolver.

## Por qué `vite@^7.0.0` y no `^6` ni `^8`

- `vitest@4.1.9` acepta `^6.0.0 || ^7.0.0 || ^8.0.0`.
- `@vitejs/plugin-react@4.7.0` (ya instalado) acepta
  `^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0` — **no incluye `^8`**.
- Intersección de ambos rangos: `^6.0.0 || ^7.0.0`. Se eligió `^7.0.0` (la
  más reciente de la intersección) en vez de `^6.0.0` para no quedar en una
  major vieja apenas publicado el fix.
- Subir a `vite@^8` directamente (lo que el resolver ya había anidado para
  `vitest` solo) hubiera cambiado el conflicto: `@vitejs/plugin-react` no
  lo acepta todavía, y ese plugin es el que usa el propio `vite.config.ts`
  del proyecto (`import react from "@vitejs/plugin-react"`).

## Cambio

**Archivo:** `frontend/package.json`

```diff
-    "vite": "^5.4.6",
+    "vite": "^7.0.0",
     "vitest": "^4.1.9"
```

Con esto, tanto la instalación normal (`npm run dev`/`build`) como la de
`vitest` comparten una única versión de `vite`, eliminando la necesidad del
árbol anidado que dejaba el lock inconsistente.

## Lo que este change NO resuelve (requiere acción del usuario)

Este sandbox no tiene acceso a la registry de npm (confirmado:
`npm ping` → `403 Forbidden`, y `npm install`/`npm install
--package-lock-only` sin `--offline` fallan igual al intentar bajar
metadata de `vite`). Regenerar `package-lock.json` a mano no es seguro:
requeriría inventar hashes de integridad (`integrity`) para cada paquete
nuevo, que `npm ci` volvería a rechazar (o peor, instalaría un tarball no
verificado si alguien desactivara la verificación). Un intento de
`npm install --package-lock-only --offline` en este sandbox, sin poder
bajar la subrama nueva de `vite@7`, terminó **borrando** entradas del lock
en vez de completarlas correctamente — se descartó ese resultado.

**Paso pendiente para el usuario, en su máquina (con red real):**

```bash
cd frontend
npm install        # resuelve vite@^7.0.0 y regenera package-lock.json completo
git add package.json package-lock.json
git commit -m "fix: bump vite to ^7.0.0 to satisfy vitest 4 peer range"
```

Después de eso, `npm ci` en CI debería pasar. Vale la pena correr
`npm run test:run` y `npm run build:ci` localmente antes de pushear, ya que
un salto de vite 5→7 puede tener cambios menores de comportamiento (aunque
para un `vite.config.ts` simple como el de este proyecto, sin plugins
exóticos, el riesgo es bajo).
