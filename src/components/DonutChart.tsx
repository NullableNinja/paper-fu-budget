type DonutRow = { label: string; value: number; color: string }

export const DonutChart = ({ rows, centerLabel, centerValue }: { rows: DonutRow[]; centerLabel: string; centerValue: string }) => {
  const visibleRows = rows.filter((row) => row.value > 0)
  const total = visibleRows.reduce((sum, row) => sum + row.value, 0)
  const radius = 44
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return <div className="donut-chart-wrap">
    <div className="donut-visual" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="donut-track" cx="60" cy="60" r={radius} />
        {visibleRows.map((row) => {
          const length = total ? row.value / total * circumference : 0
          const segment = <circle key={row.label} className="donut-segment" cx="60" cy="60" r={radius} stroke={row.color} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />
          offset += length
          return segment
        })}
      </svg>
      <div className="donut-center"><strong>{centerValue}</strong><span>{centerLabel}</span></div>
    </div>
    <div className="donut-legend">{visibleRows.map((row) => <div className="donut-legend-row" key={row.label}><span><i style={{ background: row.color }} />{row.label}</span><b>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.value)}</b></div>)}</div>
  </div>
}
