# Proposal: favorites-and-orders

## What

Migrar favoritos de `localStorage` a base de datos y construir el módulo
completo de pedidos (backend + frontend).

## Why

**Favoritos en localStorage:**
- Se pierden al cambiar de dispositivo o navegador.
- No son visibles desde el backend (no se puede mostrar "tus favoritos" en el
  panel admin ni en emails).
- No sincronizan entre sesiones del mismo usuario.

**Pedidos placeholder:**
- `MyOrdersPage` era una página vacía sin funcionalidad real.
- No existía ningún modelo de datos ni endpoint para pedidos.
- Los usuarios no tenían forma de solicitar productos de forma estructurada.

## Success criteria

- Favoritos persisten en la DB y se sincronizan entre dispositivos.
- `useFavorites` mantiene la misma interfaz pública — ningún componente
  consumidor necesita cambios.
- Actualización optimista: el toggle es inmediato en UI, revierte si la API falla.
- Los pedidos tienen estados rastreables: Pendiente → Confirmado → En proceso
  → Enviado → Entregado / Cancelado.
- Los ítems del pedido almacenan snapshot del producto (SKU, nombre, precio)
  para que ediciones futuras no alteren pedidos históricos.
- El admin puede ver todos los pedidos y cambiar su estado.

## Non-goals

- Integración con pasarela de pago.
- Stock reservado automáticamente al crear un pedido.
- Notificaciones por email al cambiar estado.
