import React from "react";
import { createPortal } from "react-dom";

export default function ModalPortal({
  title = "Details",
  open,
  onClose,
  children,
  closeOnBackdrop = true,
}) {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleBackdropClick}
    >
      <div className="card modal-card">
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
