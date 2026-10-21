import { useMemo, useState } from 'react'
import type { Bank } from '../data'
import { TopBar } from '../components/ui'
import type { SessionKind, Source } from '../types'
import { SEC_PER_Q, filterBySource, shuffle, startSession, useStore } from '../store'
import { go } from '../router'
import { startDeck } from './FlashPage'

const SOURCES: { id: Source; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'Unseen' },
  { id: 'wrong', label: 'Last wrong' },
  { id: 'due', label: 'Due' },
  { id: 'flagged', label: 'Study list' },
]
const COUNTS = [10, 20, 30, 65, 0]

export function StudyPage({ bank }: { bank: Bank }) {
  const store = useStore()
  const [kind, setKind] = useState<SessionKind>('practice')
  const [source, setSource] = useState<Source>('all')
  const [tags, setTags] = useState<string[]>([])
  const [count, setCount] = useState(20)
  const [allTags, setAllTags] = useState(false)

  const pool = useMemo(() => {
    const qs = filterBySource(bank.questions, source)
    return tags.length ? qs.filter((q) => q.t.some((t) => tags.includes(t))) : qs
    // store dependency: recompute when progress changes
  }, [bank, source, tags, store]) // eslint-disable-line react-hooks/exhaustive-deps

  const n = count === 0 ? pool.length : Math.min(count, pool.length)
  const shownTags = allTags ? bank.tags : bank.tags.slice(0, 18)

  const start = () => {
    const qids = shuffle(pool).slice(0, n).map((q) => q.n)
    const title = tags.length ? tags.slice(0, 3).join(', ') + (tags.length > 3 ? '…' : '') : kind === 'exam' ? 'Custom exam' : 'Custom practice'
    startSession({ kind, title, qids, limitSec: kind === 'exam' ? qids.length * SEC_PER_Q : null })
    go({ name: 'session' })
  }

  return (
    <div className="page">
      <TopBar title="Custom Practice" />

      <section className="card">
        <h3>Mode</h3>
        <div className="seg">
          <button className={kind === 'practice' ? 'on' : ''} onClick={() => setKind('practice')}>
            Practice
            <small>Check each answer</small>
          </button>
          <button className={kind === 'exam' ? 'on' : ''} onClick={() => setKind('exam')}>
            Timed exam
            <small>Results at the end</small>
          </button>
        </div>

        <h3>Questions from</h3>
        <div className="chips">
          {SOURCES.map((s) => (
            <button key={s.id} className={`chip ${source === s.id ? 'on' : ''}`} onClick={() => setSource(s.id)}>
              {s.label} <span className="muted">{filterBySource(bank.questions, s.id).length}</span>
            </button>
          ))}
        </div>

        <h3>
          AWS services {tags.length > 0 && <button className="btn link sm" onClick={() => setTags([])}>clear</button>}
        </h3>
        <div className="chips">
          {shownTags.map((t) => (
            <button
              key={t}
              className={`chip ${tags.includes(t) ? 'on' : ''}`}
              onClick={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
            >
              {t}
            </button>
          ))}
          <button className="chip ghost" onClick={() => setAllTags((a) => !a)}>
            {allTags ? 'Fewer' : `+${bank.tags.length - 18} more`}
          </button>
        </div>

        <h3>How many</h3>
        <div className="chips">
          {COUNTS.map((c) => (
            <button key={c} className={`chip ${count === c ? 'on' : ''}`} onClick={() => setCount(c)}>
              {c || 'All'}
            </button>
          ))}
        </div>
      </section>

      <div className="row">
        <button className="btn ghost" disabled={!n} onClick={() => startDeck(shuffle(pool).slice(0, n).map((q) => q.n))}>
          Flashcards
        </button>
        <button className="btn primary grow" disabled={!n} onClick={start}>
          Start {n} question{n === 1 ? '' : 's'}
        </button>
      </div>
      {!pool.length && <p className="muted center">No questions match these filters.</p>}
    </div>
  )
}
