import { useEffect } from "react"
import { createPortal } from "react-dom"

const ModalFrame = ({
  show,
  title,
  eyebrow = "Ironman Holter",
  onClose,
  size = "md",
  children,
  footer = null,
  variant = "default",
}) => {
  useEffect(() => {
    if (!show) return undefined
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [show, onClose])

  if (!show) return null

  const sizeClass = size === "xl" ? "ui-dialog-size-xl" : size === "lg" ? "ui-dialog-size-lg" : "ui-dialog-size-md"
  const isMedicalVariant = variant === "medical"
  const overlayClass = isMedicalVariant ? "ui-dialog-overlay medical-visit-modal-overlay" : "ui-dialog-overlay"
  const panelClass = isMedicalVariant ? "ui-dialog-panel medical-visit-modal-panel" : `ui-dialog-panel ${sizeClass}`
  const headerClass = isMedicalVariant ? "medical-visit-modal-header" : "ui-dialog-header"
  const bodyClass = isMedicalVariant ? "ui-dialog-body medical-visit-modal-body" : "ui-dialog-body"
  const footerClass = isMedicalVariant ? "medical-visit-modal-footer" : "ui-dialog-footer"
  const eyebrowClass = isMedicalVariant ? "medical-visit-modal-eyebrow" : "ui-dialog-eyebrow"
  const titleClass = isMedicalVariant ? "medical-visit-modal-title" : "ui-dialog-title"

  return createPortal(
    <div className={overlayClass} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={panelClass} onClick={(event) => event.stopPropagation()}>
        <div className={headerClass}>
          <div className="min-w-0">
            <p className={eyebrowClass}>{eyebrow}</p>
            <h3 className={titleClass}>{title}</h3>
          </div>
          <button
            type="button"
            className={isMedicalVariant ? "medical-visit-icon-button is-close" : "ui-close-btn"}
            onClick={onClose}
            aria-label="Đóng"
          >
            {isMedicalVariant ? <i className="fas fa-xmark text-xl"></i> : null}
          </button>
        </div>
        <div className={bodyClass}>{children}</div>
        {footer ? <div className={footerClass}>{footer}</div> : null}
      </div>
    </div>,
    document.body
  )
}

export default ModalFrame
