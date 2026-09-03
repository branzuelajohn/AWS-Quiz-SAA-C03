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
