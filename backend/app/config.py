from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables or `backend/.env`."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://smartfocus:smartfocus@localhost:5432/smartfocus"

    # Browser origins allowed to call the API. Native apps don't need CORS;
    # this is for `expo start --web` during development.
    cors_origins: list[str] = ["http://localhost:8081"]

    # How long a sign-in lasts before the app must sign in again.
    session_days: int = 90

    # Local development only: adds a demo@smartfocus.dev / smartfocus-demo
    # account, matching the sample data from `app/dev_seed.py`.
    demo_account: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
