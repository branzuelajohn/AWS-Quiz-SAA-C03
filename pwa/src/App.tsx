import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useBank } from './data'
import { useRoute } from './router'
import { HomePage } from './pages/HomePage'
import { ExamsPage } from './pages/ExamsPage'
import { StudyPage } from './pages/StudyPage'
import { BrowsePage } from './pages/BrowsePage'
import { ProgressPage } from './pages/ProgressPage'
import { SessionPage } from './pages/SessionPage'
import { ResultPage } from './pages/ResultPage'
import { FlashPage } from './pages/FlashPage'
import { QuestionPage } from './pages/QuestionPage'

export default function App() {
  const route = useRoute()
  const { bank, error } = useBank()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  let body
  if (error) body = <div className="page">Could not load questions: {error}</div>
  else if (!bank) body = <div className="page center muted">Loading questions…</div>
  else {
    switch (route.name) {
      case 'exams':
        body = <ExamsPage bank={bank} />
        break
      case 'study':
        body = <StudyPage bank={bank} />
        break
      case 'browse':
        body = <BrowsePage bank={bank} />
        break
      case 'progress':
        body = <ProgressPage bank={bank} />
        break
      case 'session':
        body = <SessionPage bank={bank} />
        break
      case 'flash':
        body = <FlashPage bank={bank} />
        break
      case 'result':
        body = <ResultPage bank={bank} id={route.id} />
        break
      case 'question':
        body = <QuestionPage key={route.n} bank={bank} n={route.n} />
        break
      default:
        body = <HomePage bank={bank} />
    }
  }

  return (
    <div className="app">
      <main>{body}</main>
      {(needRefresh || offlineReady) && (
        <div className="toast" role="status">
          {needRefresh ? 'A new version is available.' : 'Ready to work offline.'}
          {needRefresh && (
            <button className="btn primary sm" onClick={() => updateServiceWorker(true)}>
              Reload
            </button>
          )}
          <button
            className="btn ghost sm"
            onClick={() => {
              setNeedRefresh(false)
              setOfflineReady(false)
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
