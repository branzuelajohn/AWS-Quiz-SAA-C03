import { useMemo } from 'react'
import type { Bank } from '../data'
import { Ring } from '../components/Ring'
import { Icon, TopBar } from '../components/ui'
import { PASS_PCT, SEC_PER_Q, examSets, shuffle, startSession, useStore } from '../store'
import { go } from '../router'
import type { ExamRecord } from '../types'

const MINI = [
  { id: 'mini-10', title: 'SAA-C03 Mini Exam 1', n: 10, mins: 20 },
  { id: 'mini-20', title: 'SAA-C03 Mini Exam 2', n: 20, mins: 40 },
  { id: 'mini-30', title: 'SAA-C03 Mini Exam 3', n: 30, mins: 60 },
]

interface CardProps {
  random?: boolean
  title: string
  count: number
  mins: number
  attempts: ExamRecord[]
  doingLeft: number | null
  onStart: () => void
}

function SetCard({ random, title, count, mins, attempts, doingLeft, onStart }: CardProps) {
  const best = attempts.length ? Math.max(...attempts.map((h) => (h.correct / h.total) * 100)) : null
  const passed = best !== null && best >= PASS_PCT
  return (
    <li>
      <button className="card set" onClick={onStart}>
        <div className="set-head">
          {random ? <Icon.shuffle /> : <Icon.set />}
          <span className="eyebrow">{random ? 'Random set' : 'Question set'}</span>
          {doingLeft !== null ? (
            <span className="pill doing">Doing</span>
          ) : best !== null ? (
            <span className={`pill ${passed ? 'pass' : 'fail'}`}>{passed ? 'Pass' : 'Fail'}</span>
          ) : (
            <span className="pill new">New</span>
          )}
        </div>
        <div className="set-body">
          <div>
            <b>{title}</b>
            <div className="meta">
              <Icon.doc /> {count} questions <span>•</span> <Icon.clock />
              {doingLeft !== null ? `${Math.max(0, Math.ceil(doingLeft / 60))} mins left` : `${mins} mins`}
            </div>
          </div>
          <Ring pct={best ?? 0} size={44} stroke={4} pass={best === null ? undefined : passed} />
        </div>
      </button>
    </li>
  )
}

export function ExamsPage({ bank }: { bank: Bank }) {
  const { history, session } = useStore()
  const sets = useMemo(() => examSets(bank.questions), [bank])

  const doing = (setId: string) =>
    session?.setId === setId && session.limitSec != null ? session.limitSec - (Date.now() - session.startedAt) / 1000 : null

  const start = (setId: string, title: string, qids: number[], limitSec: number) => {
    if (session?.setId === setId) return go({ name: 'session' })
    if (session && !confirm(`Discard your unfinished "${session.title}" and start a new exam?`)) return
    startSession({ kind: 'exam', title, qids, limitSec, setId })
    go({ name: 'session' })
  }

  return (
    <div className="page">
      <TopBar title="Exam List" />
      <p className="muted small">Timed like the real exam (about 2 min per question). Pass mark {PASS_PCT}%.</p>
      <ul className="sets">
        <li className="section-title">Mini exams</li>
        {MINI.map((m) => (
          <SetCard
            key={m.id}
            random
            title={m.title}
            count={m.n}
            mins={m.mins}
            attempts={history.filter((h) => h.setId === m.id)}
            doingLeft={doing(m.id)}
            onStart={() => start(m.id, m.title, shuffle(bank.questions).slice(0, m.n).map((q) => q.n), m.mins * 60)}
          />
        ))}
        <SetCard
          random
          title="SAA-C03 Random Full Exam"
          count={65}
          mins={130}
          attempts={history.filter((h) => h.setId === 'random-full')}
          doingLeft={doing('random-full')}
          onStart={() =>
            start('random-full', 'SAA-C03 Random Full Exam', shuffle(bank.questions).slice(0, 65).map((q) => q.n), 65 * SEC_PER_Q)
          }
        />
        <li className="section-title">Full exams</li>
        {sets.map((s, i) => (
          <SetCard
            key={s.id}
            title={`SAA-C03 Full Exam ${i + 1}`}
            count={s.qids.length}
            mins={Math.round((s.qids.length * SEC_PER_Q) / 60)}
            attempts={history.filter((h) => h.setId === s.id)}
            doingLeft={doing(s.id)}
            onStart={() => start(s.id, `SAA-C03 Full Exam ${i + 1}`, s.qids, s.qids.length * SEC_PER_Q)}
          />
        ))}
      </ul>
    </div>
  )
}
