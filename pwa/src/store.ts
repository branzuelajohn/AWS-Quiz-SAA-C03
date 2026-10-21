import { useSyncExternalStore } from 'react'
import type { ExamRecord, Question, QuestionStat, Session, Source } from './types'

export const PASS_PCT = 72 // AWS passing scaled score is 720/1000
export const TARGET_PCT = 85
export const EXAM_SIZE = 65
export const SEC_PER_Q = 120 // 130 minutes / 65 questions

const DAY = 86_400_000

interface State {
  stats: Record<number, QuestionStat>
  flagged: number[]
  notes: Record<number, string>
  history: ExamRecord[]
  session: Session | null
}

const KEY = 'saa-sim.v1'
const empty: State = { stats: {}, flagged: [], notes: {}, history: [], session: null }

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : empty
  } catch {
    return empty
  }
}

let state = load()
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable; keep in-memory state
  }
  listeners.forEach((l) => l())
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export const getState = () => state

// ---- SM-2 ----

/** quality: 0-5 (>=3 is a pass) */
export function schedule(s: QuestionStat, quality: number, now = Date.now()): QuestionStat {
  let { ease, interval, reps } = s
  if (quality < 3) {
    reps = 0
    interval = 1
  } else {
    reps += 1
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ease)
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  return { ...s, ease, interval, reps, due: now + interval * DAY }
}

const blankStat = (): QuestionStat => ({ correct: 0, wrong: 0, ease: 2.5, interval: 0, reps: 0 })

export function recordAnswer(q: Question, answer: string, quality?: number) {
  const ok = answer === q.a
  const prev = state.stats[q.n] ?? blankStat()
  const next = schedule(
    {
      ...prev,
      correct: prev.correct + (ok ? 1 : 0),
      wrong: prev.wrong + (ok ? 0 : 1),
      lastAnswer: answer,
      lastCorrect: ok,
      lastAt: Date.now(),
    },
    quality ?? (ok ? 4 : 1),
  )
  set({ stats: { ...state.stats, [q.n]: next } })
}

/** Flashcard self-grade without counting as an attempt */
export function gradeCard(n: number, quality: number) {
  const prev = state.stats[n] ?? blankStat()
  set({ stats: { ...state.stats, [n]: schedule(prev, quality) } })
}

// ---- flags & notes ----

export function toggleFlag(n: number) {
  const f = state.flagged.includes(n) ? state.flagged.filter((x) => x !== n) : [...state.flagged, n]
  set({ flagged: f })
}

export function setNote(n: number, text: string) {
  const notes = { ...state.notes }
  if (text.trim()) notes[n] = text
  else delete notes[n]
  set({ notes })
}

// ---- selection ----

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function filterBySource(qs: Question[], source: Source, now = Date.now()): Question[] {
  const { stats, flagged } = state
  switch (source) {
    case 'new':
      return qs.filter((q) => !stats[q.n])
    case 'wrong':
      return qs.filter((q) => stats[q.n]?.lastCorrect === false)
    case 'due':
      return qs.filter((q) => (stats[q.n]?.due ?? Infinity) <= now)
    case 'flagged':
      return qs.filter((q) => flagged.includes(q.n))
    default:
      return qs
  }
}

/** Fixed full-length sets so scores are comparable across retries */
export function examSets(qs: Question[]) {
  const sets: { id: string; title: string; qids: number[] }[] = []
  for (let i = 0; i < qs.length; i += EXAM_SIZE) {
    const chunk = qs.slice(i, i + EXAM_SIZE)
    sets.push({ id: `set-${sets.length + 1}`, title: `Practice Exam ${sets.length + 1}`, qids: chunk.map((q) => q.n) })
  }
  return sets
}

// ---- sessions ----

export function startSession(s: Omit<Session, 'id' | 'answers' | 'marked' | 'revealed' | 'current' | 'startedAt'>) {
  set({
    session: { ...s, id: crypto.randomUUID(), answers: {}, marked: [], revealed: [], current: 0, startedAt: Date.now() },
  })
}

export function updateSession(patch: Partial<Session>) {
  if (state.session) set({ session: { ...state.session, ...patch } })
}

export function abandonSession() {
  set({ session: null })
}

export function finishSession(byNum: Map<number, Question>): ExamRecord | null {
  const s = state.session
  if (!s) return null
  let correct = 0
  for (const n of s.qids) {
    const q = byNum.get(n)!
    const ans = s.answers[n]
    if (ans === q.a) correct++
    // practice answers were recorded when revealed; exam answers are recorded now
    if (s.kind === 'exam' && ans) recordAnswer(q, ans)
  }
  const rec: ExamRecord = {
    id: s.id,
    kind: s.kind,
    title: s.title,
    setId: s.setId,
    qids: s.qids,
    answers: s.answers,
    correct,
    total: s.qids.length,
    startedAt: s.startedAt,
    finishedAt: Date.now(),
  }
  set({ history: [rec, ...state.history], session: null })
  return rec
}

// ---- backup ----

export function exportData(): string {
  const { session: _session, ...rest } = state
  void _session
  return JSON.stringify({ app: 'saa-sim', version: 1, ...rest }, null, 2)
}

export function importData(json: string) {
  const d = JSON.parse(json)
  if (d.app !== 'saa-sim') throw new Error('Not a SAA Sim backup file')
  set({ stats: d.stats ?? {}, flagged: d.flagged ?? [], notes: d.notes ?? {}, history: d.history ?? [] })
}

export function resetAll() {
  set({ ...empty })
}
