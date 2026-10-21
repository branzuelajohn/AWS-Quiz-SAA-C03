import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'exams' }
  | { name: 'study' }
  | { name: 'browse' }
  | { name: 'progress' }
  | { name: 'session' }
  | { name: 'flash' }
  | { name: 'result'; id: string }
  | { name: 'question'; n: number }

function parse(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/')
  switch (a) {
    case 'exams':
    case 'study':
    case 'browse':
    case 'progress':
    case 'session':
    case 'flash':
      return { name: a }
    case 'result':
      return { name: 'result', id: b }
    case 'q':
      return { name: 'question', n: Number(b) }
    default:
      return { name: 'home' }
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/'
    case 'result':
      return `#/result/${r.id}`
    case 'question':
      return `#/q/${r.n}`
    default:
      return `#/${r.name}`
  }
}

export function go(r: Route, replace = false) {
  if (replace) location.replace(href(r))
  else location.hash = href(r)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
