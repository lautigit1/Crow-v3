# Design: e2e-playwright-setup

## Por qué no `data-testid`

Se investigó el código real de las páginas antes de escribir los specs
(no hay `data-testid` en ningún componente de producción, solo en los
tests unitarios de Vitest). En vez de agregar `data-testid` por todos
lados -- cambio invasivo, toca componentes que no tienen nada que ver
con testing -- los locators se apoyan en lo que ya es estable en la UI:
texto de botones, placeholders, `aria-label` de iconos, y roles
implícitos (`heading`, `checkbox`, `row`).

## El problema de `Field` / `CompactField`

`shared/ui/Field.tsx` (usado en Login/Register/Checkout) y
`CompactField` (inline en `AdminProductsPage.tsx`) renderizan el label
como:

```tsx
<div>
  <span>{label}</span>
  {children}            {/* <Input/>, <Select/>, <Textarea/> */}
</div>
```

Sin `htmlFor`/`id` ni envolver el input en un `<label>` real -- por eso
`page.getByLabel(...)` no encuentra nada ahí. `helpers.ts` exporta
`fieldControl(scope, label)`, que ubica el `<span>` por su texto exacto
y agarra el primer hermano que sea (o contenga) un
`input`/`select`/`textarea`. Se usa para los campos del form de
productos que no tienen placeholder único (Stock, Precio de venta,
etc.). Donde SÍ hay placeholder (Nombre, SKU, Descripción, Email,
Contraseña) se usa `getByPlaceholder` directo, más simple.

El checkbox "Destacado" es distinto: sí es un `<label>` real
envolviendo el `<input type="checkbox">`, así que
`getByRole("checkbox", { name: "Destacado" })` funciona sin el helper.

## Credenciales / datos de prueba

- Admin: viene de `backend/app/seed.py` (`SEED_ADMIN_EMAIL` /
  `SEED_ADMIN_PASSWORD`). El `.env` de la raíz vs `backend/.env` tienen
  passwords distintas -- `helpers.ts` expone `E2E_ADMIN_EMAIL` /
  `E2E_ADMIN_PASSWORD` como override.
- No hay usuario "cliente" seedeado (las env vars `SEED_USER_EMAIL` /
  `SEED_USER_PASSWORD` existen pero `seed.py` nunca las usa) -- cada
  spec que necesita un cliente lo registra en el momento
  (`registerNewCustomer`), con email/password/nombre únicos.
- Cada producto de prueba se crea con SKU único (`E2E-<timestamp+random>`)
  para poder buscarlo de forma inequívoca en el catálogo o en la tabla
  de admin, sin depender del producto demo del seed (que solo se crea
  si la tabla está vacía -- no confiable si ya usaste la app).

## Logout vía AccountMenu

El trigger del dropdown de cuenta muestra `full_name.split(" ")[0]`
como texto -- no tiene un `aria-label` fijo. `logout(page, firstName)`
recibe ese primer nombre (`ADMIN_FIRST_NAME = "Administrador"` para el
admin, `customer.firstName = "Cliente"` para los registrados por
`registerNewCustomer`, que siempre arrancan el nombre completo con esa
palabra a propósito).

## Un solo worker

`playwright.config.ts` fuerza `workers: 1`. No hay una base de datos
efímera por test (a diferencia de los tests de backend con SQLite en
memoria) -- todos los specs pegan contra la misma Postgres real de
desarrollo. Correr en paralelo arriesgaría carreras de datos entre
specs (ej. dos tests tocando la tabla `orders` o `products` al mismo
tiempo). Los SKUs/emails únicos evitan colisiones de contenido, pero no
de timing, así que se prioriza determinismo sobre velocidad.
