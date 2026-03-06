const toneByType = {
  ai: "bg-sky-100 text-sky-700",
  doctor: "bg-emerald-100 text-emerald-700",
}

const DiagnosisBadge = ({ type, value }) => {
  if (!value) return null
  const label = type === "ai" ? "AI" : "Bac si"
  const tone = toneByType[type] || "bg-slate-100 text-slate-700"

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}: {value}
    </span>
  )
}

export default DiagnosisBadge
