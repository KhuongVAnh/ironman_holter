import { useEffect } from "react"

const ModalFrame = ({ show, title, onClose, size = "md", children, footer = null }) => {
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

  const sizeClass = size === "xl" ? "max-w-6xl" : size === "lg" ? "max-w-4xl" : "max-w-2xl"

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`modal-panel ${sizeClass}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-xl font-medium text-ink-900">{title}</h3>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Đóng" />
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

export default ModalFrame
