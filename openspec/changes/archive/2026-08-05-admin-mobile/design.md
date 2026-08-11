# Design: el panel desde el celular

## 1. Una sola vista en el DOM, no las dos

El primer intento alternaba tabla y tarjetas **solo con CSS**
(`hidden md:block` / `md:hidden`). El argumento era bueno: sin JavaScript, sin
listener de `resize`, sin re-render, y `display:none` saca el bloque también del
árbol de accesibilidad, así que un lector de pantalla no ve contenido duplicado.

**Rompió 34 tests que ya existían.** Con las dos versiones en el DOM, cada
`getByText` de las suites del panel encontraba dos resultados.

Y eso no es una molestia de los tests: es la señal de que **la duplicación se
filtra a todo lo que consulte el DOM**. Los E2E de Playwright, cualquier
herramienta de accesibilidad, cualquier test futuro. Un DOM que dice todo dos
veces es una mentira que después hay que compensar en cada consulta.

Se cambió a `useBreakpoint()`: se renderiza una sola. El costo es un listener de
`resize` por tabla, que es exactamente lo que se quería evitar — y es el precio
correcto. Es además el patrón que `CatalogPage` ya usa para alternar sidebar y
drawer.

**Contraste con la decisión de la tarjeta del catálogo**, donde SÍ se usó CSS
(`@media (hover: hover)`) en vez de JS: ahí la pregunta era "¿este dispositivo
tiene mouse?", que CSS responde y JS no. Acá la pregunta es "¿qué árbol
renderizo?", que solo puede responder JS sin duplicar el DOM. La regla no es
"CSS siempre" sino "que responda quien puede responder sin mentir".

## 2. Las columnas declaran su rol

En una tarjeta hay que saber **qué dato manda**, y no es el mismo en cada tabla.

| Rol | Dónde va |
|---|---|
| `titulo` | Encabezado de la tarjeta. Uno por tabla |
| `subtitulo` | Debajo, sin etiqueta |
| `accion` | Al pie, separado por una línea |
| `oculta` | No aparece en la tarjeta |
| sin declarar | Fila de etiqueta + valor |

**Si una tabla no declara ningún rol, la primera columna se toma como título.**
Sin ese default había que tocar las nueve pantallas antes de que ninguna
mejorara. Con él, las nueve mejoran solas y cada una se afina cuando conviene.

**Las etiquetas vuelven en la tarjeta.** En la tabla el `<th>` da el contexto
una vez arriba de todo; en una tarjeta cada valor queda huérfano sin ella.

## 3. Qué es el título en cada pantalla

No es mecánico y por eso se decide una por una:

| Pantalla | Título | Por qué |
|---|---|---|
| Pedidos | el número | Es como se los nombra por WhatsApp ("el 00042") |
| Cotizaciones | el cliente | El id de una consulta no se usa para hablar de ella |
| Productos | el nombre | El SKU importa, pero no es lo que se busca con el ojo |
| Usuarios | el nombre | — |
| Proveedores | el nombre | — |
| Inventario | el producto | — |
| Marcas / Categorías | el nombre | Tablas de dos columnas: el default ya acertaba |
| Auditoría | la acción | Es un registro de hechos, no de entidades |

## 4. `stopPropagation` en las acciones

Si la tarjeta entera es clickeable, tocar un botón dispararía **las dos cosas**:
la acción y la apertura de la ficha. En escritorio el hover da un aviso previo;
en un teléfono no hay nada entre la intención y el resultado.

## 5. Lo que se descarta

- **Ocultar columnas "poco importantes" en pantalla chica.** Achica el problema
  sin resolverlo: seguiría siendo una tabla con scroll, ahora además incompleta.
- **Una vista de tarjetas escrita a mano en cada pantalla.** Nueve
  implementaciones que divergen en tres meses.
- **Un breakpoint distinto por tabla.** El ancho al que una tabla deja de entrar
  depende de sus columnas, pero tener seis umbrales distintos hace que el panel
  se sienta inconsistente al rotar el teléfono.
