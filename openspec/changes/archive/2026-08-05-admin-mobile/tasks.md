# Tasks: el panel desde el celular

---

## Fase 1 — El componente

- [x] **1.1** `DataTable` renderiza tarjetas abajo de 768px.
- [x] **1.2** `Column` acepta `rol`: `titulo`, `subtitulo`, `accion`, `oculta`.
- [x] **1.3** Default sin roles: la primera columna es el título. Sin esto había
      que tocar las nueve pantallas antes de que ninguna mejorara.
- [x] **1.4** `stopPropagation` en las acciones (design §4).

## Fase 2 — Las nueve pantallas

- [x] **2.1** Pedidos y cotizaciones (las del mostrador).
- [x] **2.2** Productos, usuarios, proveedores, inventario, auditoría, marcas y
      categorías. El título de cada una se eligió por separado — ver la tabla de
      design §3, no es mecánico.

## Fase 3 — Tests

- [x] **3.1** `DataTable.test.tsx`: **9** tests (frontend: 180).
- [x] **3.2** Uno verifica que en escritorio cada dato aparezca **una sola vez**.
      Es el que salta si alguien vuelve a intentar el truco del CSS.
- [x] **3.3** ⚠ Los 34 fallos del primer intento están documentados en design §1.
      No fue un problema de los tests.

## Fase 4 — Verificación

- [x] **4.1** Proyecto `mobile` en `playwright.config.ts` (Pixel 7, 412px), con
      `testMatch`/`testIgnore` para que los specs no corran dos veces.
- [x] **4.2** `admin-panel.mobile.spec.ts`: **4** specs. El primero mide
      `scrollWidth - clientWidth` en cuatro pantallas: **el `min-w-[640px]`
      viejo habría pasado los 9 tests de vitest y fallado este.**
- [x] **4.3** `typecheck`, `eslint`, `steiger`.
- [x] **4.4** `npm run e2e`: **30** en verde (25 escritorio + 5 mobile).
- [ ] ⏳ **4.5** Mirarlo a mano en un teléfono real. Ningún test dice si es
      cómodo de usar con una mano.
- [x] **4.6** Tres hallazgos fuera del alcance original: barra lateral de ancho
      fijo, seis grillas de columnas fijas, y `logout()` sin esperar al
      servidor. Ver apply.md.

---

## Decisiones tomadas

| # | Decisión | Dónde |
|---|---|---|
| D1 | Una sola vista en el DOM, con `useBreakpoint` | design §1 |
| D2 | Las columnas declaran su rol | design §2 |
| D3 | Default: primera columna = título | design §2 |
| D4 | El título se elige por pantalla, no por regla | design §3 |
| D5 | `stopPropagation` en las acciones | design §4 |
| D6 | Un solo breakpoint (768px) para todas las tablas | design §5 |

## Abierto

- ⚠ **El formulario de alta de productos NO funciona a 412px**: el POST nunca
  se completa. Ya no es una sospecha -- lo comprobó el spec de mobile al
  intentar usarlo. Es un change propio.
- **Los filtros del panel de pedidos** ocupan bastante alto en un teléfono
  antes de que aparezca el primer resultado. Se podrían colapsar como en el
  catálogo.
