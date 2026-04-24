export const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

export const formatDateTime = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN")
}

export const formatDate = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("vi-VN")
}

export const getInitials = (name = "BN") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "BN"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

export const getPatientFromAccess = (item) => item?.patient || item || null

export const getAlertSeverity = (alertType) => {
  const type = normalizeText(alertType)
  if (type.includes("afib") || type.includes("rung nhi") || type.includes("ngung tim") || type.includes("critical")) return "high"
  if (type.includes("ngoai tam thu") || type.includes("nhip nhanh") || type.includes("nhip cham") || type.includes("tachy")) return "medium"
  return "low"
}

export const getAlertTone = (alertType, resolved = false) => {
  if (resolved) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  const severity = getAlertSeverity(alertType)
  if (severity === "high") return "border-red-200 bg-red-50 text-red-700"
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-sky-200 bg-sky-50 text-sky-700"
}

export const getHeartRateTone = (heartRate) => {
  const value = Number(heartRate)
  if (!Number.isFinite(value)) return "text-ink-700"
  if (value < 60) return "text-amber-600"
  if (value > 100) return "text-red-600"
  return "text-emerald-600"
}

export const DoctorStatCard = ({ icon, label, value, tone = "brand", hint }) => {
  const toneClass = {
    brand: "bg-brand-50 text-brand-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
  }[tone] || "bg-brand-50 text-brand-700"

  return (
    <div className="app-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-2 text-3xl font-bold leading-none text-ink-950">{value}</p>
          {hint ? <p className="mt-2 text-xs font-medium text-ink-500">{hint}</p> : null}
        </div>
        <span className={`inline-flex h-12 w-12 flex-none items-center justify-center rounded-xl ${toneClass}`}>
          <i className={`${icon} text-lg`}></i>
        </span>
      </div>
    </div>
  )
}

export const PatientAvatar = ({ name, size = "md" }) => {
  const sizeClass = size === "lg" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm"
  return (
    <span className={`inline-flex ${sizeClass} flex-none items-center justify-center rounded-2xl bg-brand-600 font-bold text-white shadow-soft`}>
      {getInitials(name)}
    </span>
  )
}

export const EmptyState = ({ icon = "fas fa-folder-open", title, description }) => (
  <div className="rounded-xl border border-dashed border-surface-line bg-surface-soft px-5 py-8 text-center">
    <i className={`${icon} text-3xl text-ink-300`}></i>
    <p className="mt-3 font-semibold text-ink-800">{title}</p>
    {description ? <p className="mx-auto mt-1 max-w-lg text-sm text-ink-500">{description}</p> : null}
  </div>
)

export const ClinicalTabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-2 overflow-x-auto rounded-xl border border-surface-line bg-surface-soft p-1">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        type="button"
        className={`inline-flex min-h-10 flex-none items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
          activeTab === tab.value ? "bg-white text-brand-700 shadow-soft" : "text-ink-600 hover:bg-white/70 hover:text-ink-900"
        }`}
        onClick={() => onChange(tab.value)}
      >
        <i className={tab.icon}></i>
        {tab.label}
        {tab.count !== undefined ? <span className="rounded-full bg-surface-line px-2 py-0.5 text-[11px] text-ink-700">{tab.count}</span> : null}
      </button>
    ))}
  </div>
)
