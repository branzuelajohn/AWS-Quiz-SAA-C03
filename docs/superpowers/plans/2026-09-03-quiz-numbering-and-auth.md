# 1–4 Numbering + Password Gate + Deploy-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show answer options as 1–4 (display-only) and gate the whole app behind a shared password so it can be hosted publicly and used from a phone.

**Architecture:** Frontend numbering is a pure display/keyboard mapping in `templates/index.html`; stored answer keys stay `A/B/C/D`, so the backend, question data, and dashboard are untouched. Auth is a single shared password checked in Flask via a `before_request` guard plus `/login` and `/logout` routes and a signed 30-day session cookie. Deploy-readiness makes the container port configurable and documents required env vars and a persistent volume.

**Tech Stack:** Python 3.12, Flask 3, Alpine.js + Tailwind (CDN), SQLite, Gunicorn/Docker, pytest (new dev dependency).

**Working directory:** The Flask app lives in `aws-quiz/`. `app.py` imports `models` by bare name, so Python must run with `aws-quiz/` on the path (tests handle this in `conftest.py`; manual runs use `cd aws-quiz`).

**Commit note:** Commit signing is broken on this machine (missing signing key), so every commit command below uses `git -c commit.gpgsign=false`. This does not alter your global signing config.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `aws-quiz/templates/index.html` | Quiz UI + Alpine logic | 1–4 display mapping, keyboard 1–4, hints, feedback, results; header "Log out" link |
| `aws-quiz/app.py` | Flask routes + request guards | fail-fast on missing `APP_PASSWORD`, 30-day session, auth guard, `/login` + `/logout`, CSRF exemption for login |
| `aws-quiz/templates/login.html` | New login page | Create (dark theme, password form) |
| `aws-quiz/tests/conftest.py` | pytest fixtures + path/env setup | Create |
| `aws-quiz/tests/test_auth.py` | Auth behavior tests | Create |
| `aws-quiz/requirements-dev.txt` | Dev/test dependencies | Create (`pytest`) |
| `aws-quiz/Dockerfile` | Container run command | Bind gunicorn to `${PORT:-5050}` |
| `docker-compose.yml` | Local orchestration | Pass `APP_PASSWORD` env |
| `README.md` | Docs | Document `APP_PASSWORD` + deploy notes; update Port section |

**Task order rationale:** Numbering first (Tasks 1–2) — it's verified manually while the app is still open (no login yet). Then test scaffolding (Task 3), then auth (Tasks 4–6), then deploy docs (Task 7).

---

## Task 1: Number labels on the options (display-only)

**Files:**
- Modify: `aws-quiz/templates/index.html` (Alpine object ~line 331; option label ~line 210)

- [ ] **Step 1: Add the two mapping helpers to the `quizApp()` object**

In `aws-quiz/templates/index.html`, find `formatExplanation(text)` (currently ~line 534). Immediately **before** it, inside the returned object, add these two methods (note the trailing comma chain stays valid — `formatExplanation` remains the last method):

```javascript
                keyToNumber(key) {
                    // Map stored letter key(s) to displayed number(s): A->1 ... D->4.
                    // Handles multi-letter keys defensively (e.g. "AB" -> "12").
                    if (key === null || key === undefined) return key;
                    return String(key).split('').map(c => c.charCodeAt(0) - 64).join('');
                },

                numberToKey(n) {
                    // Map a pressed digit (1-4) back to its stored letter key.
                    return String.fromCharCode(64 + n);
                },
```

- [ ] **Step 2: Show the number instead of the letter on each option button**

Find the option label span (currently line ~210):

```html
                            <span class="bg-gray-600 px-2 py-1 rounded text-sm font-mono" x-text="key"></span>
```

Replace with:

```html
                            <span class="bg-gray-600 px-2 py-1 rounded text-sm font-mono" x-text="keyToNumber(key)"></span>
```

- [ ] **Step 3: Manually verify the labels**

Run (in a separate terminal; app is not yet password-gated):

```bash
cd aws-quiz && python3 app.py
```

Open http://localhost:5050, start a quiz. Expected: each option's badge shows **1, 2, 3, 4** (top to bottom) instead of A, B, C, D. Clicking an option still highlights/selects it. Stop the server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add aws-quiz/templates/index.html
git -c commit.gpgsign=false commit -m "feat: display answer options as 1-4 (label mapping)"
```

---

## Task 2: Keyboard 1–4, hints, feedback, and results show numbers

**Files:**
- Modify: `aws-quiz/templates/index.html` (keyboard handler ~lines 375–381; hint ~lines 176–177; feedback ~line 241; results ~lines 307–309)

- [ ] **Step 1: Map number keys 1–4 to answer selection**

Find the keyboard block (currently lines ~375–381):

```javascript
                    // A-D to select an answer
                    if (['A', 'B', 'C', 'D'].includes(key) && !this.answered) {
                        if (this.currentQuestion.options && this.currentQuestion.options[key]) {
                            this.selectAnswer(key);
                        }
                        return;
                    }
```

Replace with:

```javascript
                    // 1-4 to select an answer (mapped back to the stored letter key)
                    if (['1', '2', '3', '4'].includes(event.key) && !this.answered) {
                        const letter = this.numberToKey(parseInt(event.key, 10));
                        if (this.currentQuestion.options && this.currentQuestion.options[letter]) {
                            this.selectAnswer(letter);
                        }
                        return;
                    }
```

Note: this uses `event.key` (the raw digit), not the upper-cased `key` variable defined above it. Leave the `const key = event.key.toUpperCase();` line and the `Enter` / `ArrowRight` handlers below it unchanged.

- [ ] **Step 2: Update the keyboard hint**

Find the hint (currently lines ~176–177):

```html
                    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono">A</kbd>–<kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono">D</kbd> select</span>
```

Replace with:

```html
                    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono">1</kbd>–<kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono">4</kbd> select</span>
```

- [ ] **Step 3: Show the number in the "correct answer is X" feedback**

Find (currently line ~241):

```html
                        The correct answer is <span class="font-semibold" x-text="correctAnswer"></span>
```

Replace with:

```html
                        The correct answer is <span class="font-semibold" x-text="keyToNumber(correctAnswer)"></span>
```

- [ ] **Step 4: Show numbers in the results summary**

Find (currently lines ~307–309):

```html
                            <span x-show="!answer.is_correct" class="text-gray-500 text-sm">
                                (You: <span x-text="answer.given"></span>, Correct: <span x-text="answer.correct"></span>)
                            </span>
```

Replace with:

```html
                            <span x-show="!answer.is_correct" class="text-gray-500 text-sm">
                                (You: <span x-text="keyToNumber(answer.given)"></span>, Correct: <span x-text="keyToNumber(answer.correct)"></span>)
                            </span>
```

- [ ] **Step 5: Manually verify keyboard + feedback + results**

Run `cd aws-quiz && python3 app.py`, open http://localhost:5050, start a quiz, then:
- Press keys **1–4** → the matching option is selected. Expected.
- The hint under the progress bar reads **1–4 select**. Expected.
- Submit a **wrong** answer → feedback reads "The correct answer is **N**" (a number). Expected.
- Finish the session → the answer summary shows "(You: N, Correct: M)" as numbers. Expected.

Stop the server with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add aws-quiz/templates/index.html
git -c commit.gpgsign=false commit -m "feat: number-key selection, hints, feedback, and results as 1-4"
```

---

## Task 3: Test scaffolding (pytest + conftest)

**Files:**
- Create: `aws-quiz/requirements-dev.txt`
- Create: `aws-quiz/tests/conftest.py`

- [ ] **Step 1: Add the dev dependency file**

Create `aws-quiz/requirements-dev.txt`:

```
pytest>=8.0.0
```

- [ ] **Step 2: Install it**

Run:

```bash
cd aws-quiz && python3 -m pip install -r requirements-dev.txt
```

Expected: pytest installs (or "Requirement already satisfied").

- [ ] **Step 3: Create the conftest with path/env setup and a client fixture**

Create `aws-quiz/tests/conftest.py`:

```python
"""Test setup: put aws-quiz on the path and provide required env + a Flask client."""

import os
import sys
from pathlib import Path

AWS_QUIZ_DIR = Path(__file__).parent.parent

# app.py reads APP_PASSWORD and SECRET_KEY at import time, so set them first.
os.environ.setdefault("APP_PASSWORD", "testpass")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

# app.py does `from models import ...`, so aws-quiz/ must be importable.
sys.path.insert(0, str(AWS_QUIZ_DIR))

# init_db() connects to aws-quiz/data/quiz.db but does not create the dir.
(AWS_QUIZ_DIR / "data").mkdir(exist_ok=True)

import pytest


@pytest.fixture
def client():
    import app as app_module
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as test_client:
        yield test_client
```

- [ ] **Step 4: Verify pytest collects with no tests yet**

Run:

```bash
cd aws-quiz && python3 -m pytest tests/ -v
```

Expected: "no tests ran" (exit code 5) — collection succeeds, conftest imports cleanly.

- [ ] **Step 5: Commit**

```bash
git add aws-quiz/requirements-dev.txt aws-quiz/tests/conftest.py
git -c commit.gpgsign=false commit -m "test: add pytest scaffolding and Flask client fixture"
```

---

## Task 4: Fail fast when APP_PASSWORD is unset

**Files:**
- Create: `aws-quiz/tests/test_auth.py`
- Modify: `aws-quiz/app.py` (after `app.secret_key`, ~line 17)

- [ ] **Step 1: Write the failing test**

Create `aws-quiz/tests/test_auth.py`:

```python
"""Tests for the password gate."""

import os
import subprocess
import sys
from pathlib import Path

AWS_QUIZ_DIR = Path(__file__).parent.parent


def test_missing_app_password_fails_fast():
    """Importing the app without APP_PASSWORD must abort with a clear error."""
    env = {k: v for k, v in os.environ.items() if k != "APP_PASSWORD"}
    env["SECRET_KEY"] = "x"
    result = subprocess.run(
        [sys.executable, "-c", "import app"],
        cwd=str(AWS_QUIZ_DIR),
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "APP_PASSWORD" in result.stderr
```

- [ ] **Step 2: Run it to verify it fails**

Run:

```bash
cd aws-quiz && python3 -m pytest tests/test_auth.py::test_missing_app_password_fails_fast -v
```

Expected: FAIL — the app currently imports fine without `APP_PASSWORD`, so `returncode` is 0.

- [ ] **Step 3: Add the fail-fast guard**

In `aws-quiz/app.py`, find (line ~17):

```python
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
```

Add immediately after it:

```python

APP_PASSWORD = os.environ.get('APP_PASSWORD')
if not APP_PASSWORD:
    raise RuntimeError(
        "APP_PASSWORD environment variable is not set. "
        "Refusing to start without a password gate."
    )

app.permanent_session_lifetime = timedelta(days=30)
```

Then update the imports at the top of the file. Find (line ~7):

```python
from flask import Flask, render_template, jsonify, request, session
```

Replace with:

```python
from datetime import timedelta
from flask import Flask, render_template, jsonify, request, session, redirect, url_for
```

(`redirect` and `url_for` are used by Task 5.)

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd aws-quiz && python3 -m pytest tests/test_auth.py::test_missing_app_password_fails_fast -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add aws-quiz/app.py aws-quiz/tests/test_auth.py
git -c commit.gpgsign=false commit -m "feat: fail fast when APP_PASSWORD is unset"
```

---

## Task 5: Auth guard + login/logout routes

**Files:**
- Modify: `aws-quiz/app.py` (`csrf_check` ~lines 24–28; new guard + routes)
- Modify: `aws-quiz/tests/test_auth.py` (add tests)

- [ ] **Step 1: Write the failing tests**

Append to `aws-quiz/tests/test_auth.py`:

```python
def test_page_requires_login(client):
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code == 302
    assert "/login" in resp.headers["Location"]


def test_api_requires_login_returns_401(client):
    resp = client.get("/api/tags")
    assert resp.status_code == 401


def test_login_page_is_public(client):
    resp = client.get("/login")
    assert resp.status_code == 200


def test_wrong_password_rejected(client):
    resp = client.post("/login", data={"password": "wrong"})
    assert resp.status_code == 401


def test_correct_password_grants_access(client):
    resp = client.post("/login", data={"password": "testpass"}, follow_redirects=False)
    assert resp.status_code == 302
    # Session cookie now marks the client authenticated.
    resp2 = client.get("/api/tags")
    assert resp2.status_code == 200


def test_logout_clears_session(client):
    client.post("/login", data={"password": "testpass"})
    client.get("/logout")
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code == 302
    assert "/login" in resp.headers["Location"]
```

- [ ] **Step 2: Run them to verify they fail**

Run:

```bash
cd aws-quiz && python3 -m pytest tests/test_auth.py -v
```

Expected: the six new tests FAIL (e.g. `GET /` returns 200 not 302; `/login` returns 404).

- [ ] **Step 3: Exempt the login endpoint from the JSON CSRF check**

In `aws-quiz/app.py`, find `csrf_check` (lines ~24–28):

```python
@app.before_request
def csrf_check():
    """Reject POST requests without JSON content type (CSRF protection)."""
    if request.method == 'POST' and request.content_type != 'application/json':
        return jsonify({'error': 'Content-Type must be application/json'}), 415
```

Replace with:

```python
@app.before_request
def csrf_check():
    """Reject POST requests without JSON content type (CSRF protection)."""
    # The login form posts form-encoded data; it is exempt from the JSON check.
    if request.endpoint == 'login':
        return
    if request.method == 'POST' and request.content_type != 'application/json':
        return jsonify({'error': 'Content-Type must be application/json'}), 415
```

- [ ] **Step 4: Add the auth guard immediately after `csrf_check`**

Directly below the `csrf_check` function, add:

```python
@app.before_request
def require_login():
    """Gate every route behind the shared password."""
    if request.endpoint in ('login', 'logout', 'static'):
        return
    if not session.get('authenticated'):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not authenticated'}), 401
        return redirect(url_for('login'))
```

- [ ] **Step 5: Add the login and logout routes**

In `aws-quiz/app.py`, find the `# --- Page Routes ---` section and add these routes above `index()` (they render `login.html`, created in Task 6):

```python
@app.route('/login', methods=['GET', 'POST'])
def login():
    """Shared-password login."""
    if request.method == 'POST':
        password = request.form.get('password', '')
        if secrets.compare_digest(password, APP_PASSWORD):
            session['authenticated'] = True
            session.permanent = True
            return redirect(url_for('index'))
        return render_template('login.html', error='Incorrect password'), 401
    return render_template('login.html', error=None)

@app.route('/logout')
def logout():
    """Clear the session and return to the login page."""
    session.clear()
    return redirect(url_for('login'))
```

- [ ] **Step 6: Run the tests to verify they pass**

Run:

```bash
cd aws-quiz && python3 -m pytest tests/test_auth.py -v
```

Expected: all tests PASS (1 fail-fast + 6 guard/route tests = 7 passing).

Note: `test_login_page_is_public` and `test_correct_password_grants_access` render `login.html`, which does not exist until Task 6. **If these two error with a `TemplateNotFound`, that is expected at this step** — proceed to Task 6, then re-run. (If you prefer strictly green steps, do Task 6 Step 1 before this Step 6.)

- [ ] **Step 7: Commit**

```bash
git add aws-quiz/app.py aws-quiz/tests/test_auth.py
git -c commit.gpgsign=false commit -m "feat: password auth guard with login/logout routes"
```

---

## Task 6: Login page template + header logout link

**Files:**
- Create: `aws-quiz/templates/login.html`
- Modify: `aws-quiz/templates/index.html` (header ~lines 53–58)

- [ ] **Step 1: Create the login page**

Create `aws-quiz/templates/login.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in · AWS SAA-C03 Quiz</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] } } } }
    </script>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen font-sans flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
        <h1 class="text-3xl font-bold text-orange-400 text-center mb-8">AWS SAA-C03 Quiz</h1>
        <form method="POST" action="/login" class="bg-gray-800 rounded-xl p-8 space-y-4">
            <h2 class="text-xl font-semibold">Sign in</h2>
            {% if error %}
            <div class="bg-red-900/50 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg">{{ error }}</div>
            {% endif %}
            <input type="password" name="password" autofocus autocomplete="current-password"
                   placeholder="Password"
                   class="w-full bg-gray-700 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
            <button type="submit"
                    class="w-full bg-orange-500 hover:bg-orange-600 py-3 rounded-lg font-semibold transition">
                Sign in
            </button>
        </form>
    </div>
</body>
</html>
```

- [ ] **Step 2: Add a "Log out" link to the main header**

In `aws-quiz/templates/index.html`, find the header (currently lines ~53–58):

```html
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold text-orange-400">AWS SAA-C03 Quiz</h1>
            <a href="/dashboard" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">
                Dashboard
            </a>
        </div>
```

Replace with:

```html
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold text-orange-400">AWS SAA-C03 Quiz</h1>
            <div class="flex gap-3">
                <a href="/dashboard" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">
                    Dashboard
                </a>
                <a href="/logout" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">
                    Log out
                </a>
            </div>
        </div>
```

- [ ] **Step 3: Run the full auth suite**

Run:

```bash
cd aws-quiz && python3 -m pytest tests/ -v
```

Expected: all 7 tests PASS.

- [ ] **Step 4: Manually verify the end-to-end flow**

Run:

```bash
cd aws-quiz && APP_PASSWORD=testpass SECRET_KEY=devkey python3 app.py
```

- Open http://localhost:5050 → you are redirected to **/login**. Expected.
- Enter a wrong password → "Incorrect password" error shown. Expected.
- Enter `testpass` → redirected to the quiz. Expected.
- Click **Log out** (header) → back to the login page. Expected.

Stop the server with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add aws-quiz/templates/login.html aws-quiz/templates/index.html
git -c commit.gpgsign=false commit -m "feat: login page and header logout link"
```

---

## Task 7: Deploy-readiness (port, compose env, docs)

**Files:**
- Modify: `aws-quiz/Dockerfile` (CMD, ~last line)
- Modify: `docker-compose.yml` (environment)
- Modify: `README.md` (Configuration section ~lines 175–213)

- [ ] **Step 1: Bind gunicorn to the host-provided port**

In `aws-quiz/Dockerfile`, find (last line):

```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:5050", "--workers", "2", "app:app"]
```

Replace with (shell form so `$PORT` expands; Railway/Render inject `PORT`, local defaults to 5050):

```dockerfile
CMD gunicorn --bind 0.0.0.0:${PORT:-5050} --workers 2 app:app
```

- [ ] **Step 2: Pass APP_PASSWORD through docker-compose**

In `docker-compose.yml`, find:

```yaml
    environment:
      - SECRET_KEY=${SECRET_KEY:-}
```

Replace with:

```yaml
    environment:
      - SECRET_KEY=${SECRET_KEY:-}
      - APP_PASSWORD=${APP_PASSWORD:?APP_PASSWORD must be set (e.g. in a .env file)}
```

- [ ] **Step 3: Verify compose config still parses**

Run:

```bash
APP_PASSWORD=x SECRET_KEY=y docker compose config >/dev/null && echo OK
```

Expected: `OK` (no YAML/interpolation errors).

- [ ] **Step 4: Document auth + deployment in the README**

In `README.md`, find the `### Port` heading (line ~200) and insert a new subsection **before** it, right after the Secret Key subsection (after line 198):

```markdown
### Password (required)
The app is gated behind a single shared password. It **will not start** unless `APP_PASSWORD` is set — this prevents accidentally exposing an open instance when hosting publicly.

```bash
# Docker Compose: put it in a .env file next to docker-compose.yml
echo "APP_PASSWORD=your-strong-password" >> .env
echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env
docker-compose up -d
```

Set a persistent `SECRET_KEY` in production too, so your login session survives restarts (see above).

### Deploying to Railway / Render / Fly.io
Host on a platform with a **persistent disk** — **not Vercel** (its filesystem is ephemeral, so the SQLite database and all your progress would be wiped on every cold start).

1. Point the platform at this repo; it builds `aws-quiz/Dockerfile` automatically.
2. Set environment variables: `APP_PASSWORD` (required) and `SECRET_KEY` (a fixed random value).
3. Mount a persistent volume at `/app/data` so `quiz.db` (your progress) survives restarts.
4. The container binds to the platform-provided `$PORT` automatically (falls back to 5050 locally).
```

Then update the existing `### Port` subsection body (lines ~200–206) to mention the container variable. Find:

```markdown
### Port
Default port is `5050`. To change, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:5050"  # Access on port 8080
```
```

Replace with:

```markdown
### Port
Locally the app listens on `5050`. To change the host mapping, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:5050"  # Access on port 8080
```

When deployed, the container honors the `PORT` environment variable set by the host (Railway/Render/Fly), defaulting to `5050`.
```

- [ ] **Step 5: Sanity-check the running container uses the port + password**

Run:

```bash
APP_PASSWORD=testpass SECRET_KEY=devkey PORT=5050 docker compose up --build -d && sleep 3 && \
curl -s -o /dev/null -w "%{http_code}\n" -L http://localhost:5050/ ; \
docker compose down
```

Expected: `200` (the redirect to `/login` is followed by `-L` and the login page renders). If Docker is unavailable in your environment, skip this step and rely on the local run in Task 6 Step 4.

- [ ] **Step 6: Commit**

```bash
git add aws-quiz/Dockerfile docker-compose.yml README.md
git -c commit.gpgsign=false commit -m "chore: make port configurable and document auth + deployment"
```

---

## Task 8: Final full verification

- [ ] **Step 1: Run the whole test suite**

Run:

```bash
cd aws-quiz && python3 -m pytest tests/ -v
```

Expected: 7 passed.

- [ ] **Step 2: Full manual smoke test**

Run `cd aws-quiz && APP_PASSWORD=testpass SECRET_KEY=devkey python3 app.py`, then in the browser confirm the complete story:
1. Visiting `/` redirects to `/login`.
2. Logging in with `testpass` reaches the quiz.
3. Options render as 1–4; number keys 1–4 select; wrong-answer feedback and results show numbers.
4. Dashboard still loads and reflects answered questions (data layer unchanged).
5. Log out returns to `/login`.

Stop the server with Ctrl-C.

- [ ] **Step 3: Push the branch**

```bash
git push origin feature/numbering-and-auth
```

---

## Self-Review

**Spec coverage:**
- Part 1 (numbering, display-only, all 5 edit points + helpers) → Tasks 1–2. ✓
- Part 2 (APP_PASSWORD, fail-fast, SECRET_KEY signing, 30-day session, auth guard with 401-for-API / redirect-for-pages, login/logout routes, header logout link, CSRF exemption for login) → Tasks 4–6. ✓
- Part 3 (configurable `$PORT`, persistent volume + env var docs, no platform config files) → Task 7. ✓
- Non-goal "no changes to models.py / question data / dashboard / schema" → respected; only additive header link in index.html and read-only DB use in tests. ✓

**Placeholder scan:** No TBD/TODO; every code and command step is concrete. ✓

**Type/name consistency:** `keyToNumber` / `numberToKey` (Tasks 1–2), `APP_PASSWORD` module constant (Tasks 4–5), `authenticated` session key and `login`/`logout` endpoints (Tasks 5–6) are used consistently. ✓

**Known ordering caveat:** Task 5 Step 6 may hit `TemplateNotFound` for two tests until Task 6 creates `login.html`; this is called out explicitly with the option to create the template first.
