# Design: my-orders-page

## Backend

### Nuevo endpoint: `PATCH /orders/me/{id}/cancel`

```
PATCH /api/orders/me/{order_id}/cancel
Authorization: Bearer <token usuario>
```

**Lógica:**
1. Busca el pedido por `id` donde `user_id == current_user.id`.
2. Si no existe → 404.
3. Si `status != Pendiente` → 409 `{"detail": "Solo se pueden cancelar pedidos Pendientes"}`.
4. Actualiza `status = Cancelado`, `updated_at = now()`.
5. Retorna el `OrderRead` actualizado.

No reutiliza `PATCH /orders/{id}` (admin) para no exponer el campo
`admin_notes` ni permitir transiciones de estado arbitrarias desde el cliente.

---

## Frontend

### `entities/order/index.ts`
Agregar:
```ts
cancelMine: (id: number) =>
  api.patch<Order>(`/orders/me/${id}/cancel`).then((r) => r.data),
```

### `MyOrdersPage.tsx` — estructura de componentes

```
MyOrdersPage
├── Header (título + botón "Nuevo pedido")
├── Lista de OrderCard  (sin cambios de lógica)
├── <Pagination>        ← reemplaza botones custom
├── <Drawer>            ← reemplaza OrderDetail custom
│   └── OrderDetailBody
│       ├── StatusBadge
│       ├── Notas del usuario
│       ├── Respuesta del equipo (admin_notes)
│       ├── Lista de ítems con precio unitario + subtotal
│       ├── Total general
│       └── Botón "Cancelar pedido" (solo si status === "Pendiente")
├── <ConfirmModal>      ← confirmación antes de cancelar
└── <Modal>             ← reemplaza CreateOrderModal custom
    └── CreateOrderBody
        ├── Buscador de productos (debounce 300ms)
        ├── Lista de ítems draft con controles qty
        └── Campo notas
```

### Cambios puntuales

**`OrderDetail` → `<Drawer>`**
- `open={!!selected}` / `onClose={() => setSelected(null)}`
- `title={\`Pedido #${selected?.id}\`}` / `eyebrow="Mis pedidos"`
- `footer` recibe el botón "Cancelar pedido" cuando aplica.

**`CreateOrderModal` → `<Modal>`**
- `open={showCreate}` / `onClose={() => setShowCreate(false)}`
- `title="Nuevo pedido"` / `eyebrow="Pedidos"`
- `footer` recibe los botones Cancelar + Crear.

**`<Pagination>`**
```tsx
<Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
```
Solo se renderiza cuando `total > PAGE_SIZE`.

**Cancel flow**
```
click "Cancelar pedido"
  → setConfirmCancel(true)
  → <ConfirmModal> pregunta confirmación
  → confirm → orderApi.cancelMine(selected.id)
             → setSelected(updated order)
             → fetchOrders(page)  // refresca lista
  → cancel  → no hace nada
```

**Fix TypeScript**
Reemplazar `React.CSSProperties` por `CSSProperties` importado:
```ts
import type { CSSProperties } from "react";
```
