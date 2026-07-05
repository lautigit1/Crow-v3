# Tasks: fix-ci-npm-ci

## Implementation tasks

- [x] **T1** — Reproducir el fallo localmente (`npm ci --dry-run`) y confirmar la causa raíz vía los peer-dependency warnings del propio resolver de npm
- [x] **T2** — Confirmar el rango de peerDependencies real de `@vitejs/plugin-react` instalado (`node_modules/.package-lock.json`) para elegir un rango de `vite` que no rompa el plugin
- [x] **T3** — Bump `"vite": "^5.4.6"` → `"^7.0.0"` en `frontend/package.json`
- [x] **T4** — Intentar regenerar `package-lock.json` en el sandbox (`--offline`); descartado por no ser seguro/correcto (ver nota en `design.md`)
- [ ] **T5** — **Pendiente del usuario**: correr `npm install` con red real en `frontend/`, commitear el `package-lock.json` regenerado
- [ ] **T6** — **Pendiente del usuario**: correr `npm run test:run` y `npm run build:ci` localmente antes de pushear, para confirmar que el salto vite 5→7 no rompe nada
