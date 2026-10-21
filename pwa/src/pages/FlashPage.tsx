import { useEffect, useState } from 'react'
import type { Bank } from '../data'
import { Icon, TopBar } from '../components/ui'
import { gradeCard, toggleFlag, useStore } from '../store'
import { go } from '../router'

const DECK_KEY = 'saa-sim.deck'

export function startDeck(qids: number[]) {
  sessionStorage.setItem(DECK_KEY, JSON.stringify(qids))
  go({ name: 'flash' })
}

export function FlashPage({ bank }: { bank: Bank }) {
  const { flagged } = useStore()
  const [deck] = useState<number[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(DECK_KEY) ?? '[]')
    } catch {
      return []
    }
  })
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  // per-card outcome: true = known, false = still learning
  const [results, setResults] = useState<boolean[]>([])

  const q = bank.byNum.get(deck[i])
  const known = results.filter(Boolean).length
  const learning = results.length - known

  const grade = (isKnown: boolean) => {
    if (!q) return
    gradeCard(q.n, isKnown ? 4 : 1)
    setResults((r) => [...r.slice(0, i), isKnown])
    setFlipped(false)
    setI((x) => x + 1)
  }

  const undo = () => {
    if (i === 0) return
    setResults((r) => r.slice(0, i - 1))
    setFlipped(false)
    setI((x) => x - 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowLeft') grade(false)
      else if (e.key === 'ArrowRight') grade(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!q) {
    return (
      <div className="page">
        <TopBar title="Flashcard" onBack={() => go({ name: 'home' })} />
        <div className="card center">
          <h2>{deck.length ? 'Deck complete' : 'No cards'}</h2>
          {deck.length > 0 && (
            <p className="muted">
              {known} known · {learning} still learning
            </p>
          )}
          <div className="row">
            {i > 0 && (
              <button className="btn" onClick={undo}>
                Undo last
              </button>
            )}
            <button className="btn primary" onClick={() => go({ name: 'home' })}>
              Home Screen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <TopBar title={`${i + 1}/${deck.length}`} onBack={() => go({ name: 'home' })} />
      <div className="progress">
        <div style={{ width: `${(i / deck.length) * 100}%` }} />
      </div>
      <div className="fcount">
        <span className="learning" title="Still learning">
          {learning}
        </span>
        <span className="known" title="Known">
          {known}
        </span>
      </div>

      <div className="stack">
        <button className={`flash ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)}>
          <p className="qtext">{q.q}</p>
          {flipped ? (
            <div className="answer">
              {q.a.split('').map((l) => (
                <p key={l}>
                  {l}. {q.o[l]}
                </p>
              ))}
              {q.e?.why && <p className="why">{q.e.why}</p>}
            </div>
          ) : (
            <span className="tap">Tap to reveal the answer</span>
          )}
        </button>
      </div>

      <div className="fbtns">
        <button className="round" onClick={() => grade(false)} aria-label="Still learning">
          <Icon.undo />
        </button>
        <button className={`round heart ${flagged.includes(q.n) ? 'on' : ''}`} onClick={() => toggleFlag(q.n)} aria-label="Save to study list">
          <Icon.heart />
        </button>
        <button className="round next" onClick={() => grade(true)} aria-label="Know it">
          <Icon.redo />
        </button>
      </div>
      <div className="fbtns-label">
        <span>Still learning</span>
        <span>Study list</span>
        <span>Know it</span>
      </div>
    </div>
  )
}
