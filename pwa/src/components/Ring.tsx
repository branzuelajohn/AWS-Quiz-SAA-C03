interface Props {
  pct: number
  size?: number
  label?: string
  pass?: boolean
  color?: string
  track?: string
  textColor?: string
  stroke?: number
}

export function Ring({ pct, size = 140, label, pass, color, track = 'var(--track)', textColor = 'var(--fg)', stroke }: Props) {
  const w = stroke ?? Math.max(3, size / 14)
  const r = size / 2 - w
  const c = 2 * Math.PI * r
  const fill = color ?? (pass === undefined ? 'var(--teal)' : pass ? 'var(--ok)' : 'var(--coral)')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(pct)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={w} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={fill}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={`${(c * Math.min(100, pct)) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill={textColor} fontSize={size / 4.4} fontWeight="700">
        {Math.round(pct)}%
      </text>
      {label && (
        <text x="50%" y={size / 2 + size / 5.5} textAnchor="middle" fill={textColor} opacity="0.7" fontSize={size / 11}>
          {label}
        </text>
      )}
    </svg>
  )
}
