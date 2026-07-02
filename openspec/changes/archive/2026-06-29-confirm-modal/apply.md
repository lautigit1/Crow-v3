# Apply: confirm-modal

## Archivos creados

- `frontend/src/shared/ui/ConfirmModal.tsx` — componente reutilizable

## Archivos modificados

- `frontend/src/shared/ui/index.ts` — export `ConfirmModal` agregado
- Páginas admin que tenían confirmación inline migradas a `<ConfirmModal>`

## API del componente implementada

```tsx
<ConfirmModal
  open={boolean}
  title={string}
  message={string}
  confirmLabel?={string}   // default "Confirmar"
  cancelLabel?={string}    // default "Cancelar"
  danger?={boolean}        // botón rojo si true
  loading?={boolean}       // deshabilita botones y muestra "Procesando…"
  onConfirm={() => void}
  onCancel={() => void}
/>
```

## Implementación

Usa `<Modal>` internamente — hereda header oscuro, blur, animación fadeUp.
El footer contiene los botones Cancel + Confirm con variantes `outline` y
`primary`/`danger`.

## Desviaciones del plan

Ninguna.
