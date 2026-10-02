export const BarChart = ({ rows }: { rows: Array<{ label: string; value: number; color?: string }> }) => {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return <div className="bar-chart">{rows.map((row) => <div className="bar-row" key={row.label}><div className="bar-label"><span>{row.label}</span><b>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.value)}</b></div><div className="bar-track"><i style={{ width: `${Math.max(3, row.value / max * 100)}%`, background: row.color }} /></div></div>)}</div>
}
