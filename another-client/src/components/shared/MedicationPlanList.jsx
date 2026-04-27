import { ROLE } from "../../services/string"

const displayText = (value, emptyText = "Chưa có") => {
  const text = value === null || value === undefined ? "" : String(value).trim()
  return text || emptyText
}

const formatDate = (value) => {
  if (!value) return "Chưa có"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Chưa có" : date.toLocaleDateString("vi-VN")
}

const toTextArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  const text = String(value).trim()
  return text ? [text] : []
}

const getPlanStatus = (plan) =>
  plan.is_active
    ? { label: "Đang dùng", className: "is-active", icon: "fas fa-circle-play" }
    : { label: "Đã kết thúc", className: "is-ended", icon: "fas fa-circle-check" }

const MedicationScheduleRow = ({ medication, index }) => {
  const times = toTextArray(medication.times)
  const name = displayText(medication.name, `Thuốc ${index + 1}`)

  return (
    <div className="medication-schedule-row">
      <div className="medication-name-cell">
        <span className="medication-row-index">{index + 1}</span>
        <div className="min-w-0">
          <p className="medication-name">{name}</p>
          {medication.type ? <p className="medication-type">{medication.type}</p> : null}
        </div>
      </div>

      <div className="medication-dose-cell">
        <span className="medication-dose-chip">{displayText(medication.dosage, "Chưa có liều")}</span>
      </div>

      <div className="medication-times-cell">
        {times.length ? (
          <div className="medication-time-list">
            {times.map((time, timeIndex) => (
              <span key={`${timeIndex}-${time}`} className="medication-time-chip">
                <i className="far fa-clock"></i>
                {time}
              </span>
            ))}
          </div>
        ) : (
          <span className="medication-muted-text">Chưa có</span>
        )}
      </div>

      <p className="medication-note-cell">{displayText(medication.description, "Chưa có")}</p>
    </div>
  )
}

const MedicationPlanList = ({ plans, onEdit, onDelete, role }) => {
  const canManage = role === ROLE.BENH_NHAN || role === ROLE.BAC_SI

  if (!plans || plans.length === 0) {
    return (
      <div className="empty-state-rich">
        <div className="empty-state-rich-icon success"><i className="fas fa-prescription-bottle-medical"></i></div>
        <h3 className="mt-4 text-lg font-bold text-ink-900">Chưa có kế hoạch thuốc</h3>
        <p className="mb-0 mt-2 text-sm text-ink-600">Khi có đơn thuốc, thông tin liều dùng và thời điểm uống sẽ hiển thị tại đây.</p>
      </div>
    )
  }

  return (
    <div className="medication-plan-list">
      {plans.map((plan, planIndex) => {
        const medications = plan.medications || []
        const status = getPlanStatus(plan)

        return (
          <article key={plan.plan_id} className="medication-plan-card">
            <header className="medication-plan-compact-header">
              <div className="medication-plan-heading">
                <span className="medication-plan-number">{planIndex + 1}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="medication-plan-title">{displayText(plan.title, "Kế hoạch thuốc")}</h3>
                    <span className={`medication-status-chip ${status.className}`}>
                      <i className={status.icon}></i>
                      {status.label}
                    </span>
                  </div>
                  <div className="medication-plan-facts">
                    <span>
                      <i className="far fa-calendar-plus"></i>
                      {formatDate(plan.start_date)}
                    </span>
                    <span>
                      <i className="far fa-calendar-check"></i>
                      {plan.end_date ? formatDate(plan.end_date) : "Hiện tại"}
                    </span>
                    {plan.doctor?.name ? (
                      <span>
                        <i className="fas fa-user-doctor"></i>
                        {plan.doctor.name}
                      </span>
                    ) : null}
                    <span>
                      <i className="fas fa-pills"></i>
                      {medications.length} thuốc
                    </span>
                  </div>
                </div>
              </div>

              <div className="medication-plan-header-side">
                {plan.notes ? (
                  <p className="medication-plan-inline-note">
                    <i className="fas fa-circle-info"></i>
                    {plan.notes}
                  </p>
                ) : null}
                {canManage ? (
                  <div className="medication-plan-actions">
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onEdit?.(plan)}>
                    <i className="fas fa-pen"></i>
                    
                  </button>
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete?.(plan.plan_id)}>
                    <i className="fas fa-trash"></i>

                  </button>
                  </div>
                ) : null}
              </div>
            </header>

            <section className="medication-schedule">
              <div className="medication-schedule-header">
                <span>Thuốc</span>
                <span>Liều</span>
                <span>Thời điểm uống</span>
                <span>Ghi chú</span>
              </div>

              {medications.length ? (
                medications.map((medication, index) => (
                  <MedicationScheduleRow key={medication.medication_id || `${plan.plan_id}-${index}`} medication={medication} index={index} />
                ))
              ) : (
                <div className="medication-empty-row">
                  <i className="fas fa-prescription-bottle-medical"></i>
                  Chưa có thuốc trong kế hoạch này.
                </div>
              )}
            </section>
          </article>
        )
      })}
    </div>
  )
}

export default MedicationPlanList
