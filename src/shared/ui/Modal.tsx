import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** `drawer` se ancla al borde derecho (panel lateral). */
  variant?: 'dialog' | 'drawer';
}

/**
 * Diálogo modal accesible sobre el elemento nativo <dialog>:
 * el navegador gestiona el foco, la tecla Escape y el bloqueo del fondo.
 */
export function Modal({ open, title, onClose, children, footer, variant = 'dialog' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${variant}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open && (
        <div className="dialog__panel">
          <header className="dialog__header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </header>
          <div className="dialog__body">{children}</div>
          {footer && <footer className="dialog__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
