"""Application configuration. Secrets are loaded only by the Python server."""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')


class Config:
    MAX_CONTENT_LENGTH = 3 * 1024 * 1024
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    JSON_SORT_KEYS = False
    # Railway terminates HTTPS before forwarding requests to this process.
    TRUST_PROXY = bool(os.environ.get('RAILWAY_ENVIRONMENT_ID'))
