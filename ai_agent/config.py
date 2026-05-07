import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash-001"

if not GEMINI_API_KEY:
    # Fallback for environments where key is already in env
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
