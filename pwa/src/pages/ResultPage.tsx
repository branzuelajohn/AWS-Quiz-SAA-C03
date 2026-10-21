import { useMemo, useState } from 'react'
import type { Bank } from '../data'
import { QuestionCard } from '../components/QuestionCard'
import { BottomBar, Donut, TopBar } from '../components/ui'
import { PASS_PCT, SEC_PER_Q, startSession, useStore } from '../store'
import { go } from '../router'

type Filter = 'all' | 'wrong' | 'right' | 'skipped'

const duration = (ms: number) => {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m} mins ${s % 60} secs` : `${s} secs`
}

export function ResultPage({ bank, id }: { bank: Bank; id: string }) {
  const { history } = useStore()
  const rec = history.find((h) => h.id === id)
  const [detail, setDetail] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const byTag = useMemo(() => {
    if (!rec) return []
    const m = new Map<string, { ok: number; n: number }>()
    for (const n of rec.qids) {
      const q = bank.byNum.get(n)!
      for (const t of q.t) {
        const e = m.get(t) ?? { ok: 0, n: 0 }
        e.n++
        if (rec.answers[n] === q.a) e.ok++
        m.set(t, e)
      }
    }
    return [...m.entries()].filter(([, e]) => e.n >= 2).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 6)
  }, [rec, bank])

  if (!rec) {
    return (
      <div className="page">
        <TopBar title="Exam Result" />
        <p>Result not found.</p>
      </div>
    )
  }

  const pct = (rec.correct / rec.total) * 100
  const pass = pct >= PASS_PCT
  const isRight = (n: number) => rec.answers[n] === bank.byNum.get(n)!.a
  const counts = {
    all: rec.total,
    right: rec.correct,
    wrong: rec.qids.filter((n) => rec.answers[n] && !isRight(n)).length,
    skipped: rec.qids.filter((n) => !rec.answers[n]).length,
  }

  const retry = (onlyWrong: boolean) => {
    const qids = onlyWrong ? rec.qids.filter((n) => !isRight(n)) : rec.qids
    startSession({
      kind: rec.kind,
      title: onlyWrong ? `Retry incorrect: ${rec.title}` : rec.title,
      qids,
      limitSec: rec.kind === 'exam' ? qids.length * SEC_PER_Q : null,
      setId: onlyWrong ? undefined : rec.setId,
    })
    go({ name: 'session' })
  }

  if (detail) {
    const list = rec.qids
      .map((n, i) => [n, i] as const)
      .filter(([n]) => {
        const a = rec.answers[n]
        if (filter === 'wrong') return a && !isRight(n)
        if (filter === 'right') return isRight(n)
        if (filter === 'skipped') return !a
        return true
      })
    const TABS: [Filter, string][] = [
      ['all', 'All answers'],
      ['wrong', `Wrong Question (${counts.wrong})`],
      ['right', `Correct answers (${counts.right})`],
      ['skipped', `Not answered (${counts.skipped})`],
    ]
    return (
      <div className="page with-bar">
        <TopBar title="Exam Details" onBack={() => setDetail(false)} />
        <div className="tabs">
          {TABS.map(([f, label]) => (
            <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
              {label}
            </button>
          ))}
        </div>
        <ul className="qlist">
          {list.map(([n, i]) => (
            <li key={n}>
              <QuestionCard q={bank.byNum.get(n)!} selected={rec.answers[n] ?? ''} reveal index={i} />
            </li>
          ))}
          {list.length === 0 && <li className="muted center">Nothing here.</li>}
        </ul>
        <BottomBar>
          <button className="btn" onClick={() => go({ name: 'home' })}>
            Home Screen
          </button>
          <button className="btn primary" onClick={() => retry(false)}>
            Retry
          </button>
        </BottomBar>
      </div>
    )
  }

  return (
    <div className="page with-bar">
      <TopBar title="Exam Result" onBack={() => go({ name: 'home' })} />
      <div className="result-hero">
        <div className={`badge-big ${pass ? 'pass' : 'fail'}`}>{pass ? 'Pass' : 'Fail'}</div>
        <b>{rec.title}</b>
      </div>

      <section className="card summary">
        <div className="head">
          <b>
            Result: <span className={pass ? 'pass' : 'fail'}>{pass ? 'Pass' : 'Fail'}</span>
          </b>
          <span>
            <strong>{Math.round(pct)}%</strong> Correct
          </span>
        </div>
        <div className="when">
          <div>
            <span>Time</span>
            <b>{duration(rec.finishedAt - rec.startedAt)}</b>
          </div>
          <div>
            <span>Date</span>
            <b>{new Date(rec.finishedAt).toLocaleDateString()}</b>
          </div>
        </div>
        <div className="pie">
          <Donut
            parts={[
              [counts.right, 'var(--teal)'],
              [counts.wrong, 'var(--coral)'],
              [counts.skipped, 'var(--grey)'],
            ]}
          />
          <div>
            <b>{rec.total} questions</b>
            <ul className="legend">
              <li>
                <i style={{ background: 'var(--teal)' }} /> Correct: {counts.right}
              </li>
              <li>
                <i style={{ background: 'var(--coral)' }} /> Wrong: {counts.wrong}
              </li>
              <li>
                <i style={{ background: 'var(--grey)' }} /> Not Answer: {counts.skipped}
              </li>
            </ul>
          </div>
        </div>
        <p className="note">*(Need {PASS_PCT}% correct to pass)</p>
      </section>

      {byTag.length > 0 && (
        <section className="card">
          <h3>Weakest areas in this attempt</h3>
          {byTag.map(([t, e]) => (
            <div key={t} className="bar-row">
              <span>{t}</span>
              <div className="bar">
                <div style={{ width: `${(e.ok / e.n) * 100}%` }} />
              </div>
              <span className="muted">
                {e.ok}/{e.n}
              </span>
            </div>
          ))}
        </section>
      )}

      {counts.wrong + counts.skipped > 0 && (
        <button className="btn wide" onClick={() => retry(true)}>
          Retry incorrect ({counts.wrong + counts.skipped})
        </button>
      )}

      <BottomBar>
        <button
          className="btn"
          onClick={() => {
            setFilter(counts.wrong ? 'wrong' : 'all')
            setDetail(true)
            window.scrollTo(0, 0)
          }}
        >
          Detail
        </button>
        <button className="btn primary" onClick={() => retry(false)}>
          Retry
        </button>
      </BottomBar>
    </div>
  )
}
