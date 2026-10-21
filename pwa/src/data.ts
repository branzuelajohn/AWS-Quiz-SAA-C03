import { useEffect, useState } from 'react'
import type { Question } from './types'

export interface Bank {
  questions: Question[]
  byNum: Map<number, Question>
  tags: string[]
}

let cache: Promise<Bank> | null = null

function loadBank(): Promise<Bank> {
  cache ??= fetch(`${import.meta.env.BASE_URL}questions.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load questions (${r.status})`)
      return r.json() as Promise<Question[]>
    })
    .then((questions) => {
      const counts = new Map<string, number>()
      questions.forEach((q) => q.t.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
      return {
        questions,
        byNum: new Map(questions.map((q) => [q.n, q])),
        tags: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
      }
    })
  return cache
}

export function useBank(): { bank: Bank | null; error: string | null } {
  const [bank, setBank] = useState<Bank | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadBank().then(setBank, (e: Error) => setError(e.message))
  }, [])
  return { bank, error }
}

/** Number of answers required, e.g. "Choose two" */
export const pickCount = (q: Question) => q.a.length
