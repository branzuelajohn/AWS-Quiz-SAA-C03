import { useEffect, useState } from 'react'
import type { Bank } from '../data'
import { Ring } from '../components/Ring'
import { Art } from '../components/ui'
import { TARGET_PCT, filterBySource, shuffle, startSession, useStore } from '../store'
import { go } from '../router'
import { startDeck } from './FlashPage'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
}

export function HomePage({ bank }: { bank: Bank }) {
  const { stats, history, session, flagged } = useStore()
  const [install, setInstall] = useState<InstallEvent | null>(null)

  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setInstall(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])

  const seen = Object.keys(stats).length
  const attempts = Object.values(stats).reduce((a, s) => a + s.correct + s.wrong, 0)
  const correct = Object.values(stats).reduce((a, s) => a + s.correct, 0)
  const due = filterBySource(bank.questions, 'due')
  const exams = history.filter((h) => h.kind === 'exam' && h.total >= 20).slice(0, 3)
  const readiness = exams.length ? (exams.reduce((a, h) => a + h.correct / h.total, 0) / exams.length) * 100 : null
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!'

  const passMsg =
    readiness === null
      ? 'Take a full exam to see your pass rate.'
      : readiness >= TARGET_PCT
        ? "Great! You're ready to take the exam."
        : `Keep practising – aim for ${TARGET_PCT}%+ before booking.`

  return (
    <div className="page">
      <header className="hello">
        <h1>{greet}</h1>
        <p className="sub">AWS Certified Solutions Architect – Associate (SAA-C03)</p>
        <p>Simulation tests to get you ready. Practise daily to sharpen your knowledge.</p>
      </header>

      <button className="passrate" onClick={() => go({ name: 'progress' })}>
        <Ring pct={readiness ?? 0} size={64} color="#f59e0b" track="rgb(255 255 255 / 0.25)" textColor="#fff" stroke={6} />
        <div>
          <b>Exam Pass Rate ›</b>
          <span>{passMsg}</span>
        </div>
      </button>

      {session && (
        <a className="card resume" href="#/session">
          <div>
            <b>Continue: {session.title}</b>
            <div className="muted small">
              Question {session.current + 1} of {session.qids.length}
            </div>
          </div>
          <span className="btn primary sm">Resume</span>
        </a>
      )}

      <section className="hub">
        <button className="hubtile" onClick={() => go({ name: 'exams' })}>
          <Art.exam />
          Take Exam
        </button>
        <button className="hubtile" onClick={() => go({ name: 'progress' })}>
          <Art.result />
          Result
        </button>
        <button className="hubtile" onClick={() => go({ name: 'browse' })}>
          <Art.review />
          Review Question
        </button>
        <button
          className="hubtile"
          onClick={() => {
            const pool = due.length ? due : bank.questions
            startDeck(shuffle(pool).slice(0, 20).map((q) => q.n))
          }}
        >
          {due.length > 0 && <span className="pill doing">{due.length} due</span>}
          <Art.flash />
          Flashcard
        </button>
        <button className="hubtile" onClick={() => go({ name: 'study' })}>
          <Art.study />
          Custom Practice
        </button>
        <button
          className="hubtile"
          disabled={!flagged.length}
          onClick={() => {
            const qids = shuffle(filterBySource(bank.questions, 'flagged')).map((q) => q.n)
            startSession({ kind: 'practice', title: 'Study List', qids, limitSec: null })
            go({ name: 'session' })
          }}
        >
          <Art.list />
          Study List
          <small>{flagged.length} saved</small>
        </button>
      </section>

      <section className="card stats">
        <div>
          <b>
            {seen}/{bank.questions.length}
          </b>
          <span>questions seen</span>
        </div>
        <div>
          <b>{attempts ? Math.round((correct / attempts) * 100) : 0}%</b>
          <span>accuracy</span>
        </div>
        <div>
          <b>{history.length}</b>
          <span>sessions</span>
        </div>
      </section>

      {install && (
        <button
          className="btn wide"
          onClick={async () => {
            await install.prompt()
            setInstall(null)
          }}
        >
          Install app for offline use
        </button>
      )}
      {isIos && <p className="muted small center">On iPhone: tap Share → “Add to Home Screen” to install and use it offline.</p>}
      <p className="muted small center">Independent study tool. Not affiliated with or endorsed by Amazon Web Services.</p>
    </div>
  )
}
