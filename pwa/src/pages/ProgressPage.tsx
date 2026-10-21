import { useMemo, useRef, useState } from 'react'
import type { Bank } from '../data'
import { TopBar } from '../components/ui'
import { PASS_PCT, TARGET_PCT, exportData, importData, resetAll, useStore } from '../store'

export function ProgressPage({ bank }: { bank: Bank }) {
  const { stats, history } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const tagRows = useMemo(() => {
    const m = new Map<string, { ok: number; n: number }>()
    for (const q of bank.questions) {
      const s = stats[q.n]
      if (!s) continue
      for (const t of q.t) {
        const e = m.get(t) ?? { ok: 0, n: 0 }
        e.ok += s.correct
        e.n += s.correct + s.wrong
        m.set(t, e)
      }
    }
    return [...m.entries()].filter(([, e]) => e.n >= 3).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)
  }, [bank, stats])

  const exams = history.filter((h) => h.kind === 'exam').slice(0, 12).reverse()
  const W = 300
  const H = 90
  const pts = exams.map((h, i) => [exams.length === 1 ? W / 2 : (i / (exams.length - 1)) * W, H - (h.correct / h.total) * H] as const)
  const yOf = (pct: number) => H - (pct / 100) * H

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `saa-sim-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="page">
      <TopBar title="Result" />

      <section className="card">
        <h3>Mock exam scores</h3>
        {exams.length ? (
          <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} className="spark" role="img" aria-label="Exam score trend">
            <line x1="0" x2={W} y1={yOf(PASS_PCT)} y2={yOf(PASS_PCT)} className="pass-line" />
            <line x1="0" x2={W} y1={yOf(TARGET_PCT)} y2={yOf(TARGET_PCT)} className="target-line" />
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4" fill={exams[i].correct / exams[i].total * 100 >= PASS_PCT ? 'var(--ok)' : 'var(--bad)'} />
            ))}
          </svg>
        ) : (
          <p className="muted">No exams yet.</p>
        )}
        <p className="muted small">Dashed lines: pass {PASS_PCT}% and target {TARGET_PCT}%.</p>
      </section>

      <section className="card">
        <h3>History</h3>
        <ul className="qlist">
          {history.slice(0, 30).map((h) => {
            const pct = Math.round((h.correct / h.total) * 100)
            return (
              <li key={h.id}>
                <a className="qrow" href={`#/result/${h.id}`}>
                  <span className={`dot ${pct >= PASS_PCT ? 'ok' : 'bad'}`} />
                  <span className="clip">
                    {h.title} <span className="muted small">· {new Date(h.finishedAt).toLocaleDateString()}</span>
                  </span>
                  <b>{pct}%</b>
                </a>
              </li>
            )
          })}
          {!history.length && <li className="muted">Complete a session to see it here.</li>}
        </ul>
      </section>

      <section className="card">
        <h3>By AWS service (weakest first)</h3>
        {tagRows.length ? (
          tagRows.map(([t, e]) => (
            <div key={t} className="bar-row">
              <span>{t}</span>
              <div className="bar">
                <div style={{ width: `${(e.ok / e.n) * 100}%` }} />
              </div>
              <span className="muted">{Math.round((e.ok / e.n) * 100)}%</span>
            </div>
          ))
        ) : (
          <p className="muted">Answer a few questions to see per-service accuracy.</p>
        )}
      </section>

      <section className="card">
        <h3>Your data</h3>
        <p className="muted small">Progress is stored only on this device. Export a backup to move it to another device.</p>
        <div className="row wrap">
          <button className="btn ghost" onClick={download}>
            Export backup
          </button>
          <button className="btn ghost" onClick={() => file.current?.click()}>
            Import backup
          </button>
          <button
            className="btn ghost danger"
            onClick={() => {
              if (confirm('Erase all progress, notes and history on this device?')) {
                resetAll()
                setMsg('Progress reset.')
              }
            }}
          >
            Reset
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              importData(await f.text())
              setMsg('Backup imported.')
            } catch (err) {
              setMsg((err as Error).message)
            }
            e.target.value = ''
          }}
        />
        {msg && <p className="small">{msg}</p>}
      </section>
    </div>
  )
}
