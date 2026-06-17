"""Vercel serverless entrypoint for the Flask API."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api_server import app  # noqa: E402  (Vercel expects `app`)
