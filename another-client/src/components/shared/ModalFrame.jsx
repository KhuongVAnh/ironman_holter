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

  const sizeClass = size === "xl" ? "modal-size-xl" : size === "lg" ? "modal-size-lg" : "modal-size-md"
  const isMedicalVariant = variant === "medical"
  const overlayClass = isMedicalVariant ? "modal-overlay medical-visit-modal-overlay" : "modal-overlay"
  const panelClass = isMedicalVariant ? "modal-panel medical-visit-modal-panel" : `modal-panel ${sizeClass}`
  const headerClass = isMedicalVariant ? "medical-visit-modal-header" : "modal-header"
  const bodyClass = isMedicalVariant ? "modal-body medical-visit-modal-body" : "modal-body"
  const footerClass = isMedicalVariant ? "medical-visit-modal-footer" : "modal-footer"
  const eyebrowClass = isMedicalVariant ? "medical-visit-modal-eyebrow" : "modal-eyebrow"
  const titleClass = isMedicalVariant ? "medical-visit-modal-title" : "modal-title-text"

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
            className={isMedicalVariant ? "medical-visit-icon-button is-close" : "btn-close"}
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
