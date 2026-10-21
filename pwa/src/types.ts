export interface Question {
  n: number
  q: string
  o: Record<string, string>
  /** Correct letters, sorted, e.g. "A" or "BD" */
  a: string
  /** Community vote share, e.g. { D: "93%" } */
  v: Record<string, string>
  t: string[]
  e?: Explanation
  /** Set when garbled source text was repaired */
  fixed?: string
}

export interface Explanation {
  why: string
  /** Why each incorrect option is wrong */
  others: Record<string, string>
  tip: string
  /** Non-empty when the answer key looks doubtful */
  flag: string
}

export interface QuestionStat {
  correct: number
  wrong: number
  lastAnswer?: string
  lastCorrect?: boolean
  lastAt?: number
  // SM-2 scheduling
  ease: number
  interval: number
  reps: number
  due?: number
}

export type SessionKind = 'exam' | 'practice'

export interface Session {
  id: string
  kind: SessionKind
  title: string
  qids: number[]
  answers: Record<number, string>
  marked: number[]
  /** Practice mode: questions whose answer has been checked */
  revealed: number[]
  current: number
  startedAt: number
  /** null = untimed */
  limitSec: number | null
  setId?: string
}

export interface ExamRecord {
  id: string
  kind: SessionKind
  title: string
  setId?: string
  qids: number[]
  answers: Record<number, string>
  correct: number
  total: number
  startedAt: number
  finishedAt: number
}

export type Source = 'all' | 'new' | 'wrong' | 'due' | 'flagged'
