import { useCallback, useRef, useState } from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
  loading: boolean;
};

const CLOSED: ConfirmState = {
  open: false,
  loading: false,
  title: "",
  message: "",
};

/**
 * Hook que reemplaza window.confirm() con un modal asíncrono.
 *
 * Uso:
 *   const { confirmProps, askConfirm } = useConfirm();
 *   const ok = await askConfirm({ title: "¿Eliminar?", message: `Eliminar "${name}"`, danger: true });
 *   if (!ok) return;
 *   // ... proceder
 *   <ConfirmModal {...confirmProps} />
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(CLOSED);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const askConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...opts, open: true, loading: false });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    resolveRef.current?.(true);
    resolveRef.current = null;
    // El loading se limpia cuando el caller cierra el modal (open → false)
    setState(CLOSED);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(CLOSED);
  }, []);

  return {
    askConfirm,
    confirmProps: {
      open: state.open,
      title: state.title,
      message: state.message,
      confirmLabel: state.confirmLabel,
      cancelLabel: state.cancelLabel,
      danger: state.danger,
      loading: state.loading,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
