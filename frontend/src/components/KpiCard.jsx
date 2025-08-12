export function KpiCard({ title, value, hint, right }) {
  return (
    <div className="c-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <h3 className="text-2xl font-heading font-extrabold mt-1">{value}</h3>
        </div>
        {right}
      </div>
      {hint && <p className="text-xs text-gray-500 mt-3">{hint}</p>}
    </div>
  )
}