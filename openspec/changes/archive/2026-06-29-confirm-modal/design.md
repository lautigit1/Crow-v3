# Design: confirm-modal

## Componente ConfirmModal

**Archivo:** `frontend/src/shared/ui/ConfirmModal.tsx`

Construido sobre el `Modal` existente. API:

```tsx
<ConfirmModal
  open={confirmOpen}
  title="¿Eliminar producto?"
  message='¿Eliminar "Filtro de aceite K&N"? Esta acción no se puede deshacer.'
  confirmLabel="Eliminar"       // default: "Confirmar"
  cancelLabel="Cancelar"        // default: "Cancelar"
  danger                        // true → botón de confirm en rojo
  onConfirm={handleConfirm}
  onCancel={() => setConfirmOpen(false)}
/>
```

## Hook useConfirm (opcional pero recomendado)

Para evitar que cada página maneje su propio estado `open/item`, un hook encapsula el patrón:

```tsx
const { confirmProps, askConfirm } = useConfirm();

// Uso:
const remove = async (p: Product) => {
  const ok = await askConfirm({
    title: "¿Eliminar producto?",
    message: `¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`,
    danger: true,
  });
  if (!ok) return;
  await productApi.remove(p.id);
};

// En el JSX:
<ConfirmModal {...confirmProps} />
```

El hook devuelve una Promise<boolean> — `true` si confirmó, `false` si canceló. Elimina todo el boilerplate de estado en cada página.

## Páginas a actualizar

1. `AdminProductsPage.tsx` — función `remove()`
2. `AdminSuppliersPage.tsx` — función de eliminar proveedor
3. `AdminCategoriesPage.tsx` — función de eliminar categoría
4. `AdminBrandsPage.tsx` — función de eliminar marca
5. `AdminUsersPage.tsx` — función de eliminar usuario (con mensaje extra de "no se puede deshacer")

## Exportación

Agregar `ConfirmModal` y `useConfirm` al barrel de `@/shared/ui`.
