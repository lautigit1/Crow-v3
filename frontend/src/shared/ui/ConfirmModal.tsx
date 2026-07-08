import { Modal } from "./Modal";
import { Button } from "./Button";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={400}
      footer={
        <div className="flex gap-2.5 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={loading}>
            {loading ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="font-body text-[14px] text-ink900 m-0 leading-[1.55]">{message}</p>
    </Modal>
  );
}
