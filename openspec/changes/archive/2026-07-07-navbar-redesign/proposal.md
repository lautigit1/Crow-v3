# Proposal: navbar-redesign

## Qué

Rediseño completo de `widgets/navbar/Navbar.tsx`, montada en `PublicLayout`
y visible en todas las páginas públicas del sitio (Home, Catálogo, Marcas,
Contacto, Producto, Carrito, Cuenta). No es un ajuste de color: cambia la
estructura, el tema (claro-con-blur → oscuro-opaco), la navegación mobile
(hamburguesa+drawer → dock inferior) y agrega una búsqueda tipo *command
palette*.

## Por qué

El usuario, tras ver la navbar actual en uso ("no me gustan los íconos...",
ya resuelto en el change anterior), pidió explícitamente reestructurarla:
"esta muy poblada al pedo" (recargada sin necesidad) y "que la hagas mucho
mas fachera" — más personalidad, menos plantilla genérica. Trajo además un
brief detallado pidiendo evitar patrones típicos de navbar (logo-izquierda
+ links-centro+ botón-derecha, barra blanca con blur, glassmorphism
genérico, hover solo de color, hamburguesa mobile) y en cambio construir
algo con identidad, zonas flotantes/asimétricas y microinteracciones más
elaboradas que opacity/translateY.

## Diagnóstico de la navbar actual

- Barra blanca translúcida con blur — exactamente el patrón que el usuario
  pidió evitar, y visualmente el mismo lenguaje que cualquier SaaS
  genérico (Vercel/Linear/Stripe-esque).
- Estructura 100% simétrica: logo | nav centrada | search+cart+cuenta.
- En mobile: logo + carrito + hamburguesa que abre un drawer con
  buscador + links + cuenta apilados — el patrón "menú hamburguesa" que
  el brief pide específicamente reemplazar.
- Sin nada que la identifique como *de esta marca*: podría ser la navbar
  de cualquier e-commerce. No usa el lenguaje visual ya establecido en el
  resto del sitio en este mismo change-set (índices mono "01—", fondo
  ink900, subrayado animado, chips redondeados).

## Concepto elegido

Barra oscura opaca (`bg-ink900`, no blur/translúcida) que funciona como el
"chasis" de la marca, con tres zonas flotantes asimétricas en vez de un
único plano:

1. **Marca**: logo + un chip mono en vivo ("● Abierto ahora" / "Cerrado",
   calculado desde `contact.hours`) — dato funcional real, no decorativo.
2. **Navegación**: rail de links con un subrayado que se desliza entre
   ítems (mismo gesto ya usado en el Hero y en `CategoryGrid`'s "Ver
   catálogo" — se extiende el motivo en vez de inventar un cuarto patrón
   de hover), en una "isla" con borde sutil propio, no pegada al logo.
3. **Acciones**: cápsula blanca flotante (buscar / WhatsApp / carrito /
   cuenta) — un segundo material (claro sobre oscuro) en vez de un botón
   aislado en la esquina.

La búsqueda deja de ser un input siempre visible (parte de lo que hacía
sentir "poblada" la barra) y pasa a un ícono que abre un *command palette*
centrado (atajo de teclado "/"), con las categorías como accesos rápidos.

En mobile, la barra superior se reduce a logo + chip de estado (nada más)
y toda la navegación pasa a un **dock inferior flotante** de 5 accesos
(Inicio / Catálogo / Buscar [elevado, abre el mismo command palette] /
Carrito / Menú [hoja inferior con Marcas, Contacto y cuenta]) — reemplaza
por completo la hamburguesa.

## Non-goals

- No se toca `AdminLayout` ni su navegación (fuera de alcance, el pedido
  es sobre el sitio público).
- No se rediseña el contenido de `Footer.tsx`.
- No se cambia el copy de negocio (teléfono, horario, WhatsApp) — se
  reutiliza tal cual vive en `shared/config/contact.ts`.
- No se agregan mega-menús con submenús por categoría dentro del rail de
  navegación (el catálogo ya tiene su propio filtro robusto en
  `CatalogPage`); el "quick access" a categorías vive en el command
  palette, no en un dropdown del nav.

## Criterio de éxito

- Ningún patrón de la lista "prohibida" del usuario sobrevive: sin barra
  blanca con blur, sin glassmorphism genérico, sin botón aislado tipo
  "Get Started", sin hamburguesa mobile, sin hover de solo-color.
- La barra se siente parte del mismo sistema visual que Hero /
  CategoryGrid / StatsSection / CtaFinal (mono, ink900, subrayado
  animado), no una pieza aparte.
- Usabilidad intacta: buscar, ver carrito, entrar a la cuenta y navegar
  las 4 secciones siguen siendo accesibles en 1-2 taps/clics, con foco
  visible y navegación por teclado.
- Confirmación visual del usuario (mismo criterio que el resto de este
  proyecto: capturas de pantalla, iteración si hace falta).
