# Apply: el panel desde el celular

## Resumen

`DataTable` tenía `min-w-[640px]` y scroll horizontal: en un teléfono se veía
menos de dos tercios de cada fila. Ahora, abajo de 768px, cada fila es una
tarjeta y la barra lateral es un panel deslizante.

**Lo importante de este change no es la tarjeta.** Es que el test que mide el
desborde encontró **tres problemas distintos, ninguno en el componente que se
había tocado**: una barra lateral de ancho fijo, seis grillas de columnas fijas,
y un `logout()` que no esperaba al servidor.

## Archivos

**Nuevos:** `e2e/admin-panel.mobile.spec.ts` (5),
`src/__tests__/DataTable.test.tsx` (9), `src/app/router/ScrollAlInicio.tsx`,
`src/app/providers/lenisScroll.ts`.

**Modificados:** `shared/ui/DataTable.tsx`, las nueve páginas de `pages/admin/`,
`pages/admin/AdminLayout.tsx`, `pages/admin/ui/TrendsSection.tsx`,
`entities/session/context.tsx`, `features/auth/AccountMenu.tsx`,
`widgets/navbar/Navbar.tsx`, `app/App.tsx`, `app/providers/LenisProvider.tsx`,
`playwright.config.ts`, `src/__tests__/AuthProvider.test.tsx`.

## Decisiones

- **Una sola vista en el DOM.** El primer intento alternaba tabla y tarjetas con
  CSS (`hidden md:block`) — sin listener de resize, sin re-render. **Rompió 34
  tests existentes**: con las dos versiones presentes, cada `getByText` de las
  suites del panel encontraba dos resultados. No era un problema de los tests;
  la duplicación se filtra a todo lo que consulte el DOM. Se pasó a
  `useBreakpoint`.
- **Contraste con la tarjeta del catálogo**, donde sí se eligió CSS
  (`@media (hover: hover)`): ahí la pregunta es "¿este dispositivo tiene
  mouse?", que CSS responde y JS no. Acá es "¿qué árbol renderizo?", que solo
  responde JS sin duplicar. La regla no es "CSS siempre" sino "que conteste
  quien pueda contestar sin mentir".
- **Las columnas declaran su rol** (`titulo`, `subtitulo`, `accion`, `oculta`),
  con default a la primera columna. Sin ese default había que tocar las nueve
  pantallas antes de que ninguna mejorara.
- **El título se eligió pantalla por pantalla** (design §3): en pedidos el
  número —así se los nombra por WhatsApp—, en cotizaciones el cliente, en
  auditoría la acción.
- **`stopPropagation` en las acciones.** En escritorio el hover avisa; en un
  teléfono no hay nada entre la intención y el resultado.

## Lo que se descubrió en el camino

**La barra lateral tenía 260px fijos a cualquier ancho.** `grid-cols-[260px_1fr]`
dejaba 152px de contenido en una pantalla de 412 → **138px de desborde**. Las
tablas ya eran tarjetas y el panel seguía roto: arreglar la tabla no alcanzaba.
Ahora es un panel deslizante que se cierra solo al navegar.

**Seis grillas con columnas fijas.** `grid-cols-4` de tarjetas de estadísticas
en usuarios, proveedores, dashboard, estadísticas, inventario y tendencias — 84px
por tarjeta en un teléfono. Mismo patrón que la barra: **una medida pensada para
escritorio, escrita sin condicional.** `AdminStatsPage` además usaba un
breakpoint propio (`max-[900px]`), alineado al del resto.

**`logout()` era "fire and forget", y eso es un problema de seguridad chico pero
real.** Limpiaba el estado de React y mandaba el POST sin esperarlo; las cookies
son HttpOnly y solo el servidor puede borrarlas, así que entre el clic y la
respuesta la sesión seguía siendo válida. Cerrar sesión y apretar F5 enseguida
podía dejarte adentro. Lo destaparon **dos** E2E distintos, y las dos veces el
error decía "no encuentro el campo Email" — que no insinúa el problema real.
Ahora espera al servidor; el estado local se sigue limpiando al instante.

**El scroll no volvía arriba al navegar** (reportado por Lauti). React Router no
lo hace solo: en una SPA no hay navegación, solo un cambio de componentes. Y
había una vuelta extra: el sitio público usa Lenis, cuyo `requestAnimationFrame`
deshace un `window.scrollTo` en el cuadro siguiente — hay que pedírselo a él.
Se resetea por `pathname` y no por la ubicación completa, así filtrar el catálogo
o cambiar de página no tira a nadie arriba.

**El formulario de alta de productos no funciona a 412px.** Apareció cuando el
spec de mobile intentó usarlo: el POST nunca se completa. Es un problema real y
**distinto** del que este change resolvió; queda en `tasks.md`.

**Un email sin `truncate` desborda una tarjeta.** No tiene espacios, así que es
un bloque indivisible. Se corrigió en usuarios y proveedores, y el campo de
detalle de auditoría pasó a `break-words`.

**Dos errores propios en el spec de mobile**, anotados porque son fáciles de
repetir:
- `waitForLoadState("networkidle")` **no se puede usar en esta app**: el panel
  mantiene una conexión SSE permanente contra `/api/events`, así que la
  condición no se cumple nunca y el test muere a los 60 segundos.
- Un `test.skip` "por si la base está vacía" terminó salteándose siempre, y un
  test que se saltea en silencio se ve igual que uno que pasa. Ahora el test
  crea su propio pedido, pidiendo explícitamente un producto **con stock**.

## Verificación

- **Frontend:** `typecheck`, `eslint` y `steiger` limpios, **190** de vitest.
- **E2E:** 30 specs en verde — 25 de escritorio y 5 de mobile (Pixel 7).

## Pendiente

- ⏳ **Mirarlo en un teléfono real.** Ningún test dice si es cómodo de usar con
  una mano, que era el punto del change.
- ⚠ **El formulario de alta de productos en pantalla angosta** (ver arriba).
- **Los filtros del panel de pedidos** ocupan bastante alto en un teléfono antes
  del primer resultado. Se podrían colapsar como en el catálogo.
- **Las otras siete pantallas** tienen roles asignados pero no se miraron una por
  una en un dispositivo.
