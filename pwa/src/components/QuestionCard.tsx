import { useState } from 'react'
import type { Question } from '../types'
import { pickCount } from '../data'
import { Icon } from './ui'

const WORDS = ['', 'one', 'two', 'three', 'four', 'five']

interface Props {
  q: Question
  selected: string
  onChange?: (answer: string) => void
  reveal?: boolean
  index?: number
  total?: number
  bookmarked?: boolean
  /** Show the explanation expanded once revealed */
  explainOpen?: boolean
}

export function toggleLetter(q: Question, selected: string, letter: string): string {
  const need = pickCount(q)
  if (need === 1) return letter
  let next = selected.includes(letter) ? selected.replace(letter, '') : selected + letter
  // keep at most `need` picks, dropping the oldest
  if (next.length > need) next = next.slice(next.length - need)
  return next.split('').sort().join('')
}

export function QuestionCard({ q, selected, onChange, reveal, index, total, bookmarked, explainOpen }: Props) {
  const need = pickCount(q)
  const state = reveal ? (selected === q.a ? ' is-ok' : ' is-bad') : ''
  return (
    <article className={`qcard${state}`}>
      {bookmarked && <span className="ribbon" aria-label="Marked" />}
      <div className="qmeta">
        <span>{index !== undefined && total !== undefined ? `Question ${index + 1}/${total}` : ''}</span>
        <span>#{q.n}</span>
      </div>
      <p className="qtext">
        {index !== undefined && !onChange ? `${index + 1}. ` : ''}
        {q.q}
      </p>
      <p className="pick">{need > 1 ? `(Select ${WORDS[need] ?? need} answers)` : '(Select the best answer)'}</p>
      <ul className="options" role={need > 1 ? 'group' : 'radiogroup'}>
        {Object.entries(q.o).map(([letter, text]) => {
          const isSel = selected.includes(letter)
          const isRight = q.a.includes(letter)
          let cls = 'option'
          if (isSel) cls += ' selected'
          if (reveal && isRight) cls += ' right'
          if (reveal && isSel && !isRight) cls += ' wrong'
          return (
            <li key={letter}>
              <button
                type="button"
                className={cls}
                role={need > 1 ? 'checkbox' : 'radio'}
                aria-checked={isSel}
                disabled={!onChange}
                onClick={() => onChange?.(toggleLetter(q, selected, letter))}
              >
                <span className={`radio ${need > 1 ? 'square' : ''}`} />
                <span className="otext">
                  {letter}. {text}
                </span>
                {reveal && q.v[letter] && <span className="vote">{q.v[letter]}</span>}
                {reveal && isSel && !isRight && (
                  <span className="mark">
                    <Icon.cross />
                  </span>
                )}
                {reveal && isRight && (
                  <span className="mark">
                    <Icon.check />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {reveal && (
        <div className="verdict">
          {selected === q.a ? 'Correct' : selected ? 'Incorrect' : 'Not answered'} · Answer <b>{q.a.split('').join(', ')}</b>
          {Object.keys(q.v).length > 0 && (
            <span className="muted"> · Community {Object.entries(q.v).map(([k, v]) => `${k} ${v}`).join(', ')}</span>
          )}
        </div>
      )}
      {reveal && q.fixed && <p className="edited">Edited: {q.fixed}</p>}
      {reveal && q.e && <ExplanationBox key={q.n} q={q} defaultOpen={!!explainOpen} />}
      {q.t.length > 0 && (
        <div className="tags">
          {q.t.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function ExplanationBox({ q, defaultOpen }: { q: Question; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const e = q.e!
  return (
    <div className="explain">
      {e.flag && (
        <p className="flag">
          <b>Answer key may be disputed:</b> {e.flag}
        </p>
      )}
      {!open ? (
        <button className="btn link" onClick={() => setOpen(true)}>
          View Explanation
        </button>
      ) : (
        <>
          <p>
            <b>Why {q.a.split('').join(' + ')}:</b> {e.why}
          </p>
          {Object.entries(e.others)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([l, text]) => (
              <p key={l} className="other">
                <b>{l}.</b> {text}
              </p>
            ))}
          {e.tip && (
            <p className="tip">
              <b>Exam tip:</b> {e.tip}
            </p>
          )}
          <button className="btn link" onClick={() => setOpen(false)}>
            Hide Explanation
          </button>
        </>
      )}
    </div>
  )
}
