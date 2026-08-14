import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "ClaimForge"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Storage and DB
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'storage' / 'claimforge.db'}"
    
    # LLM (Phase 2+)
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
