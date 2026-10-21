import { useMemo, useState } from 'react'
import type { Bank } from '../data'
import { TopBar } from '../components/ui'
import type { Source } from '../types'
import { filterBySource, useStore } from '../store'

const PAGE = 50

export function BrowsePage({ bank }: { bank: Bank }) {
  const store = useStore()
  const [text, setText] = useState('')
  const [source, setSource] = useState<Source>('all')
  const [tag, setTag] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const list = useMemo(() => {
    const needle = text.trim().toLowerCase()
    return filterBySource(bank.questions, source).filter(
      (q) =>
        (!tag || q.t.includes(tag)) &&
        (!needle || String(q.n) === needle || q.q.toLowerCase().includes(needle) || Object.values(q.o).some((o) => o.toLowerCase().includes(needle))),
    )
  }, [bank, text, source, tag, store]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <TopBar title="Review Question" />
      <input
        className="search"
        type="search"
        placeholder="Search text or question #"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setLimit(PAGE)
        }}
      />
      <div className="row wrap">
        <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
          <option value="all">All questions</option>
          <option value="new">Unseen</option>
          <option value="wrong">Last answered wrong</option>
          <option value="due">Due for review</option>
          <option value="flagged">Study list</option>
        </select>
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Any service</option>
          {bank.tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <span className="muted">{list.length} found</span>
      </div>
      <ul className="qlist">
        {list.slice(0, limit).map((q) => {
          const s = store.stats[q.n]
          return (
            <li key={q.n}>
              <a className="qrow" href={`#/q/${q.n}`}>
                <span className={`dot ${s ? (s.lastCorrect ? 'ok' : 'bad') : ''}`} />
                <span className="num">#{q.n}</span>
                <span className="clip">{q.q}</span>
                {store.flagged.includes(q.n) && <span style={{ color: "var(--coral)" }}>♥</span>}
              </a>
            </li>
          )
        })}
      </ul>
      {list.length > limit && (
        <button className="btn ghost wide" onClick={() => setLimit((l) => l + PAGE)}>
          Show more
        </button>
      )}
    </div>
  )
}
