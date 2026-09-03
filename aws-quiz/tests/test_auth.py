"""Tests for the password gate."""

import os
import subprocess
import sys
from pathlib import Path

AWS_QUIZ_DIR = Path(__file__).parent.parent

# Use the project venv Python if available (it has Flask installed).
# Fall back to sys.executable so tests still run in other environments.
_VENV_PYTHON = AWS_QUIZ_DIR.parent / "venv" / "bin" / "python3"
PYTHON = str(_VENV_PYTHON) if _VENV_PYTHON.exists() else sys.executable


def test_missing_app_password_fails_fast():
    """Importing the app without APP_PASSWORD must abort with a clear error."""
    env = {k: v for k, v in os.environ.items() if k != "APP_PASSWORD"}
    env["SECRET_KEY"] = "x"
    result = subprocess.run(
        [PYTHON, "-c", "import app"],
        cwd=str(AWS_QUIZ_DIR),
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "APP_PASSWORD" in result.stderr


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
    resp2 = client.get("/api/tags")
    assert resp2.status_code == 200


def test_logout_clears_session(client):
    client.post("/login", data={"password": "testpass"})
    client.get("/logout")
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code == 302
    assert "/login" in resp.headers["Location"]


def test_non_ascii_password_rejected_cleanly(client):
    """A non-ASCII password must return 401, not a 500 from compare_digest."""
    resp = client.post("/login", data={"password": "wrong-café"})
    assert resp.status_code == 401


def test_login_form_post_not_blocked_by_csrf(client):
    """Form-encoded POST to /login must be exempt from the JSON CSRF check (not 415)."""
    resp = client.post("/login", data={"password": "wrong"})
    assert resp.status_code != 415
