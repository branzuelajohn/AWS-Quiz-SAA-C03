# SAA-C03 Exam Simulator (PWA)

An installable, offline-first exam simulator built from the question bank in `../questions`.
All progress lives on the device (localStorage); export/import a backup from **Progress**.

## Features

- **Practice exams** – 16 fixed sets (65 questions, 130 min, pass mark 72%) with best-score badges and retakes
- **Random mock exam** – 65 random questions, timed
- **Practice mode** – check each answer instantly, with community vote shares
- **Custom sessions** – filter by source (unseen / last wrong / due / study list) and AWS service tags
- **Flashcards** – Again/Hard/Good/Easy grading feeds SM-2 spaced repetition
- **Review** – results screen with weakest services, filter wrong/skipped, "Retry incorrect"
- **Question bank** – search, filter, personal notes per question, study list
- **Progress** – score trend vs pass/target lines, history, per-service accuracy, readiness score
- Mark-for-review, question navigator, resumable sessions, keyboard shortcuts (A–F, Enter, ←/→, M)

## Develop

```bash
npm install
npm run questions   # regenerate public/questions.json from ../questions/*.json
npm run dev
npm run build && npm run preview   # test the service worker / install prompt
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages) over HTTPS.
On iPhone open the site in Safari → Share → **Add to Home Screen**.
