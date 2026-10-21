import { useCallback, useEffect, useState } from 'react'
import type { Bank } from '../data'
import { QuestionCard, toggleLetter } from '../components/QuestionCard'
import { abandonSession, finishSession, recordAnswer, toggleFlag, updateSession, useStore } from '../store'
import { go } from '../router'
import { BottomBar, TopBar } from '../components/ui'

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (x: number) => String(x).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

export function SessionPage({ bank }: { bank: Bank }) {
  const { session, flagged } = useStore()
  const [now, setNow] = useState(Date.now())
  const [showNav, setShowNav] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const submit = useCallback(() => {
    const rec = finishSession(bank.byNum)
    if (rec) go({ name: 'result', id: rec.id }, true)
  }, [bank])

  const remaining = session?.limitSec != null ? session.limitSec - (now - session.startedAt) / 1000 : null

  useEffect(() => {
    if (remaining !== null && remaining <= 0) submit()
  }, [remaining, submit])

  const q = session ? bank.byNum.get(session.qids[session.current]) : undefined
  const selected = (q && session?.answers[q.n]) || ''
  const isPractice = session?.kind === 'practice'
  const revealed = !!(q && isPractice && session?.revealed.includes(q.n))

  const choose = useCallback(
    (ans: string) => {
      if (!session || !q || revealed) return
      updateSession({ answers: { ...session.answers, [q.n]: ans } })
    },
    [session, q, revealed],
  )

  const move = useCallback(
    (delta: number) => {
      if (!session) return
      const i = Math.min(session.qids.length - 1, Math.max(0, session.current + delta))
      updateSession({ current: i })
      window.scrollTo(0, 0)
    },
    [session],
  )

  const check = useCallback(() => {
    if (!session || !q || !selected || revealed) return
    recordAnswer(q, selected)
    updateSession({ revealed: [...session.revealed, q.n] })
  }, [session, q, selected, revealed])

  const toggleMark = useCallback(() => {
    if (!session || !q) return
    const m = session.marked.includes(q.n) ? session.marked.filter((x) => x !== q.n) : [...session.marked, q.n]
    updateSession({ marked: m })
  }, [session, q])

  const isLast = session ? session.current === session.qids.length - 1 : false

  const primary = useCallback(() => {
    if (isPractice && !revealed && selected) check()
    else if (isLast) setConfirmSubmit(true)
    else move(1)
  }, [isPractice, revealed, selected, check, isLast, move])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      const k = e.key.toUpperCase()
      if (k in q.o) choose(toggleLetter(q, selected, k))
      else if (e.key === 'Enter') primary()
      else if (e.key === 'ArrowRight') move(1)
      else if (e.key === 'ArrowLeft') move(-1)
      else if (k === 'M') toggleMark()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, selected, choose, primary, move, toggleMark])

  if (!session || !q) {
    return (
      <div className="page">
        <p>No active session.</p>
        <a className="btn" href="#/">
          Home
        </a>
      </div>
    )
  }

  const answered = session.qids.filter((n) => session.answers[n]).length
  const marked = session.marked.includes(q.n)

  return (
    <div className="page session with-bar">
      <TopBar
        title={`${session.current + 1}/${session.qids.length}`}
        onBack={() => go({ name: 'home' })}
        right={
          remaining !== null ? (
            <span className={`timer ${remaining < 300 ? 'low' : ''}`}>{fmt(remaining)}</span>
          ) : (
            <span className="timer muted">{fmt((now - session.startedAt) / 1000)}</span>
          )
        }
      />
      <div className="progress">
        <div style={{ width: `${(answered / session.qids.length) * 100}%` }} />
      </div>
      <div className="row between small">
        <b>{session.title}</b>
        <span className="muted">
          {answered} answered
        </span>
      </div>

      <QuestionCard
        q={q}
        selected={selected}
        onChange={revealed ? undefined : choose}
        reveal={revealed}
        index={session.current}
        total={session.qids.length}
        bookmarked={marked}
        explainOpen
      />

      <div className="sessiontools">
        <button className={`btn ghost sm ${marked ? 'on' : ''}`} onClick={toggleMark}>
          {marked ? 'Marked for review' : 'Mark for review'}
        </button>
        <button className={`btn ghost sm ${flagged.includes(q.n) ? 'on' : ''}`} onClick={() => toggleFlag(q.n)}>
          {flagged.includes(q.n) ? '♥ In study list' : '♡ Study list'}
        </button>
        <button className={`btn ghost sm ${showNav ? 'on' : ''}`} onClick={() => setShowNav((s) => !s)}>
          All questions
        </button>
        <button className="btn ghost sm" onClick={() => setConfirmSubmit(true)}>
          Submit
        </button>
      </div>

      {showNav && (
        <div className="navgrid">
          {session.qids.map((n, i) => {
            let cls = 'cell'
            if (session.answers[n]) cls += ' done'
            if (session.marked.includes(n)) cls += ' mark'
            if (i === session.current) cls += ' cur'
            if (isPractice && session.revealed.includes(n)) {
              cls += session.answers[n] === bank.byNum.get(n)!.a ? ' ok' : ' bad'
            }
            return (
              <button
                key={n}
                className={cls}
                onClick={() => {
                  updateSession({ current: i })
                  setShowNav(false)
                }}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      )}

      <BottomBar>
        <button className="btn" disabled={session.current === 0} onClick={() => move(-1)}>
          ← Prev
        </button>
        <button className="btn primary" onClick={primary}>
          {isPractice && !revealed && selected
            ? 'Check'
            : isLast
              ? 'Finish'
              : isPractice && !revealed
                ? 'Skip →'
                : 'Next →'}
        </button>
      </BottomBar>
      <p className="hint muted">Keys: A–F select · Enter next/check · ←/→ move · M mark</p>

      {confirmSubmit && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="sheet">
            <h3>Submit {session.kind === 'exam' ? 'exam' : 'session'}?</h3>
            <p>
              {answered} of {session.qids.length} answered
              {session.marked.length > 0 && `, ${session.marked.length} marked for review`}.
            </p>
            <div className="row">
              <button className="btn ghost" onClick={() => setConfirmSubmit(false)}>
                Keep going
              </button>
              <button className="btn primary" onClick={submit}>
                Submit
              </button>
            </div>
            <button
              className="btn link danger"
              onClick={() => {
                abandonSession()
                go({ name: 'home' }, true)
              }}
            >
              Discard without saving
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
