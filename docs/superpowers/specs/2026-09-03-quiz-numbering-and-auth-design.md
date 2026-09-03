# Design: 1–4 Numbering + Password Gate + Deploy-Readiness

Date: 2026-09-03
Status: Approved

## Context

The AWS SAA-C03 quiz is a self-hosted study tool: Flask + SQLite backend
(`aws-quiz/app.py`, `aws-quiz/models.py`), Alpine.js + Tailwind frontend
(`aws-quiz/templates/index.html`, `aws-quiz/templates/dashboard.html`), with
1018 question JSON files and spaced-repetition (SM-2) progress stored in
`data/quiz.db`. It currently runs via Docker/Gunicorn on port 5050 with no
authentication.

The user wants to (1) show answer options as 1–4 instead of A–D, and (2) add a
lightweight password gate so the app can be hosted publicly and used from a
phone.

## Hosting decision

The app will be hosted on a container platform with a **persistent disk**
(Railway / Render / Fly.io), **not Vercel**. Rationale: Vercel is serverless
with an ephemeral filesystem, so the SQLite database — and therefore all
progress and spaced-repetition scheduling — would be wiped on every cold start,
defeating the purpose of the study tool. Keeping a persistent-disk host means
the Flask + SQLite data layer is unchanged.

## Non-goals

- No changes to `models.py`, the question data (1018 JSON files), the DB schema,
  or the dashboard.
- No multi-user accounts, registration, or roles — a single shared password.
- No conversion of stored answer keys; `A/B/C/D` remains the canonical storage
  format.
- No full platform config files (`render.yaml` / `fly.toml`) unless requested
  later. Dockerfile + env vars are sufficient for auto-deploy.

---

## Part 1 — Answer options A–D → 1–4 (display-only)

All changes are confined to `aws-quiz/templates/index.html`. The backend, the
question JSON files, and the DB continue to use `A/B/C/D`. Only the displayed
label and the keyboard-to-key mapping change. Options are stored as an
insertion-ordered dict (`{"A": ..., "B": ..., "C": ..., "D": ...}`), preserved
through JSON and Alpine's `x-for`, so position ↔ letter is stable.

Two helper functions on the `quizApp()` object:

- `keyToNumber(key)` → `key.charCodeAt(0) - 64` (A→1, B→2, C→3, D→4; also
  handles E→5 defensively).
- `numberToKey(n)` → `String.fromCharCode(64 + n)` (1→A, 2→B, …).

Edits:

1. **Option label** (currently line ~210): `x-text="key"` →
   `x-text="keyToNumber(key)"`. The click handler `selectAnswer(key)` is
   unchanged and still stores/sends the **letter**.
2. **Keyboard handler** (currently lines ~375–381): replace the
   `['A','B','C','D']` block with one that fires on `'1'`–`'4'`, converts the
   digit to its letter via `numberToKey`, and calls `selectAnswer(letter)` only
   if `currentQuestion.options[letter]` exists. The A–D keyboard shortcuts are
   removed (replaced, per the request).
3. **Keyboard hint** (currently lines ~176–177): change the `A`–`D` `<kbd>`
   hint to `1`–`4`.
4. **Incorrect-answer feedback** (currently line ~241): render
   `keyToNumber(correctAnswer)` instead of the raw letter.
5. **Results summary** (currently lines ~307–309): render
   `keyToNumber(answer.given)` and `keyToNumber(answer.correct)`.

Outcome: everything shown and pressed is 1–4; everything stored and sent to the
backend stays A–D. Existing progress data and the dashboard are unaffected.

---

## Part 2 — Login page + session cookie (Flask)

Changes in `aws-quiz/app.py` plus a new `aws-quiz/templates/login.html`.

### Configuration

- New env var **`APP_PASSWORD`** — the shared gate password. **If unset, the app
  fails fast at startup** (raise `RuntimeError` / exit with a clear message) so it
  can never be deployed with no gate. There is no default and no open-access
  fallback.
- Reuses existing **`SECRET_KEY`** to sign the session cookie. Must be a fixed
  value in production so sessions survive restarts (already env-configurable).
- `app.permanent_session_lifetime = timedelta(days=30)` so a phone stays logged
  in for a month.

### Auth guard

A `@app.before_request` handler (registered after `ensure_db` and alongside the
existing `csrf_check`):

- Allow-list (no auth required): the `login` and `logout` endpoints and static
  assets (`request.endpoint == 'static'`).
- If `session.get('authenticated')` is not truthy:
  - For paths under `/api/`: return `401 JSON` (`{'error': 'Not authenticated'}`).
  - Otherwise: `redirect(url_for('login'))`.

### Routes

- **`GET /login`** — render `templates/login.html` (dark theme matching the
  app; single password field; optional error message).
- **`POST /login`** — read the submitted password; compare with
  `secrets.compare_digest(submitted, APP_PASSWORD)` (constant-time). On success:
  `session['authenticated'] = True`, `session.permanent = True`,
  `redirect(url_for('index'))`. On failure: re-render `login.html` with an
  error and HTTP 401.
- **`GET /logout`** — `session.clear()` then `redirect(url_for('login'))`.

### UI

- Add a small **"Log out"** link in the header of `index.html` next to the
  existing Dashboard link (and optionally in `dashboard.html` for consistency).

### CSRF interaction

The existing `csrf_check` rejects POSTs whose `Content-Type` is not
`application/json`. The login form submits form-encoded data, so the `login`
endpoint is **exempted** from `csrf_check` (guard with
`if request.endpoint == 'login': return`). Login CSRF is a negligible risk for a
single-user tool. All existing JSON API POSTs remain subject to `csrf_check`.

---

## Part 3 — Deploy-readiness

Minimal changes required to actually run on a persistent-disk host.

- **Configurable port**: the Dockerfile `CMD` currently hardcodes gunicorn to
  `5050`. Railway/Render inject a `$PORT`. Change the `CMD` to bind
  `0.0.0.0:${PORT:-5050}` (shell form so the variable expands), keeping 5050 as
  the local default.
- **Persistent data & secrets** (documented in `README.md`):
  - Mount `data/` (containing `quiz.db`) as a persistent volume.
  - Set `SECRET_KEY` (fixed, secret) and `APP_PASSWORD` as environment
    variables on the host.
- No `render.yaml` / `fly.toml` generated at this stage (out of scope unless
  requested).

---

## Files touched

| File | Change |
|------|--------|
| `aws-quiz/templates/index.html` | 1–4 display mapping, keyboard, hints, feedback, results; header logout link |
| `aws-quiz/app.py` | Auth guard, `/login` + `/logout` routes, session lifetime, CSRF exemption for login |
| `aws-quiz/templates/login.html` | New dark-theme login page |
| `aws-quiz/templates/dashboard.html` | (Optional) header logout link |
| `Dockerfile` | Bind gunicorn to `${PORT:-5050}` |
| `README.md` | Document `APP_PASSWORD`, persistent volume, deploy notes |

## Testing / verification

- **Numbering**: load a quiz; options render as 1–4; pressing 1–4 selects the
  matching option; submitting still scores correctly (letter sent to backend);
  incorrect-answer feedback and results summary show numbers; dashboard still
  reflects answers.
- **Auth**: with `APP_PASSWORD` set, an unauthenticated page request redirects
  to `/login`; an unauthenticated `/api/*` request returns 401; correct password
  logs in and persists across a browser restart; wrong password shows an error;
  `/logout` returns to the login page.
- **Deploy**: container honors `$PORT`; `data/quiz.db` persists across restarts
  when the volume is mounted.
