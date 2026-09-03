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
