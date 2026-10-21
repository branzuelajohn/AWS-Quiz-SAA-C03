import type { ReactNode } from 'react'
import { go } from '../router'

const sv = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const Icon = {
  back: () => (
    <svg viewBox="0 0 24 24" {...sv}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  shuffle: () => (
    <svg viewBox="0 0 24 24" {...sv}>
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  ),
  set: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3h11l3 3v15H5z" opacity=".9" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  doc: () => (
    <svg viewBox="0 0 24 24" {...sv}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" {...sv}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" {...sv} stroke="var(--ok)">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M7.5 12.5l3 3 6-6.5" />
    </svg>
  ),
  cross: () => (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10.5" fill="var(--bad)" />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  undo: () => (
    <svg viewBox="0 0 24 24" {...sv}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 010 12h-3" />
    </svg>
  ),
  redo: () => (
    <svg viewBox="0 0 24 24" {...sv}>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H10a6 6 0 000 12h3" />
    </svg>
  ),
  heart: () => (
    <svg viewBox="0 0 24 24" {...sv}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
    </svg>
  ),
}

export function TopBar({ title, right, onBack }: { title: ReactNode; right?: ReactNode; onBack?: () => void }) {
  return (
    <header className="topbar">
      <button
        className="back"
        aria-label="Back"
        onClick={onBack ?? (() => (history.length > 1 ? history.back() : go({ name: 'home' })))}
      >
        <Icon.back />
      </button>
      <h1>{title}</h1>
      <div>{right}</div>
    </header>
  )
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="bottombar">
      <div>{children}</div>
    </div>
  )
}

/** Donut chart; segments are [value, color] */
export function Donut({ parts, size = 110 }: { parts: [number, string][]; size?: number }) {
  const total = parts.reduce((a, [v]) => a + v, 0) || 1
  const r = size / 2 - size / 7
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={size / 3.5} />
      {parts.map(([v, color], i) => {
        const len = (v / total) * c
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={size / 3.5}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )
        offset += len
        return el
      })}
    </svg>
  )
}

/** Simple original spot illustrations for the home hub */
export const Art = {
  exam: () => (
    <svg viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" fill="#dfe4ff" />
      <path d="M28 14h24M28 66h24M30 14c0 14 20 16 20 26S30 52 30 66M50 14c0 14-20 16-20 26s20 12 20 26" fill="none" stroke="#2238c8" strokeWidth="3" strokeLinecap="round" />
      <path d="M33 60c3-5 11-5 14 0z" fill="#f59e0b" />
      <path d="M35 24h10l-5 7z" fill="#f59e0b" />
    </svg>
  ),
  result: () => (
    <svg viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" fill="#d9f3ef" />
      <rect x="18" y="44" width="10" height="18" rx="2" fill="#26b5a5" />
      <rect x="35" y="32" width="10" height="30" rx="2" fill="#2238c8" />
      <rect x="52" y="22" width="10" height="40" rx="2" fill="#f59e0b" />
      <path d="M16 64h48" stroke="#1b1f6e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  review: () => (
    <svg viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" fill="#fff0d9" />
      <rect x="20" y="16" width="34" height="44" rx="4" fill="#fff" stroke="#1b1f6e" strokeWidth="2.5" />
      <path d="M27 28h20M27 36h20M27 44h12" stroke="#7a8194" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="52" cy="52" r="10" fill="none" stroke="#2238c8" strokeWidth="3.5" />
      <path d="M59 59l7 7" stroke="#2238c8" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  flash: () => (
    <svg viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" fill="#e8e2ff" />
      <rect x="22" y="22" width="34" height="42" rx="4" fill="#9aa6f2" transform="rotate(-10 39 43)" />
      <rect x="26" y="18" width="34" height="42" rx="4" fill="#2238c8" />
      <path d="M36 36h14M36 43h9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  study: () => (
    <svg viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" fill="#dff3e8" />
      <path d="M40 22c-6-4-14-4-20-2v38c6-2 14-2 20 2 6-4 14-4 20-2V20c-6-2-14-2-20 2z" fill="#fff" stroke="#1b1f6e" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M40 22v38" stroke="#1b1f6e" strokeWidth="2.5" />
      <path d="M46 30h8M46 37h8M26 30h8M26 37h8" stroke="#22a06b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  list: () => (
    <svg viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" fill="#ffe4df" />
      <path d="M28 16h24v48l-12-9-12 9z" fill="#f2735f" />
      <path d="M40 27l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="#fff" />
    </svg>
  ),
}
