import { useState } from 'react'
import type { Bank } from '../data'
import { TopBar } from '../components/ui'
import { QuestionCard } from '../components/QuestionCard'
import { recordAnswer, setNote, toggleFlag, useStore } from '../store'

export function QuestionPage({ bank, n }: { bank: Bank; n: number }) {
  const { stats, flagged, notes } = useStore()
  const q = bank.byNum.get(n)
  const [sel, setSel] = useState('')
  const [reveal, setReveal] = useState(false)

  if (!q) return <div className="page">Question not found.</div>
  const s = stats[n]
  const prev = bank.byNum.has(n - 1) ? n - 1 : null
  const next = bank.byNum.has(n + 1) ? n + 1 : null

  return (
    <div className="page" key={n}>
      <TopBar title={`Question #${n}`} />
      <div className="row between">
        <span className="muted small">
          {s ? `${s.correct}✓ ${s.wrong}✗${s.due ? ` · next review ${new Date(s.due).toLocaleDateString()}` : ''}` : 'Not attempted'}
        </span>
      </div>
      <QuestionCard q={q} selected={sel} onChange={reveal ? undefined : setSel} reveal={reveal} explainOpen />
      <div className="row wrap">
        {!reveal ? (
          <>
            <button
              className="btn primary"
              disabled={!sel}
              onClick={() => {
                recordAnswer(q, sel)
                setReveal(true)
              }}
            >
              Check
            </button>
            <button className="btn ghost" onClick={() => setReveal(true)}>
              Show answer
            </button>
          </>
        ) : (
          <button
            className="btn ghost"
            onClick={() => {
              setSel('')
              setReveal(false)
            }}
          >
            Try again
          </button>
        )}
        <button className={`btn ghost ${flagged.includes(n) ? 'on' : ''}`} onClick={() => toggleFlag(n)}>
          {flagged.includes(n) ? '⚑ In study list' : '⚐ Study list'}
        </button>
      </div>
      <label className="notes">
        <span>My notes / explanation</span>
        <textarea
          rows={4}
          placeholder="Why is this the answer? Key facts to remember…"
          defaultValue={notes[n] ?? ''}
          onBlur={(e) => setNote(n, e.target.value)}
        />
      </label>
      <div className="row between">
        {prev ? <a className="btn ghost sm" href={`#/q/${prev}`}>← #{prev}</a> : <span />}
        {next ? <a className="btn ghost sm" href={`#/q/${next}`}>#{next} →</a> : <span />}
      </div>
    </div>
  )
}
